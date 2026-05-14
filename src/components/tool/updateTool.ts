import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import { saveProfilePicture } from '@service/file-storage';
import fs from 'fs';

export const ValidationSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    link: z.string().url().optional(),
    category: z.string().max(100).optional(),
    status: z.enum(['online', 'beta', 'new']).optional(),
    keep_banner_file_ids: z.string().optional(),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const { id } = req.params;
  const updates = { ...req.body } as Record<string, unknown>;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  
  const logoFile = files?.logo?.[0];
  const bannerFiles = files?.banners || [];

  const keepBannerRaw = updates.keep_banner_file_ids;
  delete updates.keep_banner_file_ids;

  const cleanupTemp = (): void => {
    if (logoFile?.path && fs.existsSync(logoFile.path)) fs.unlinkSync(logoFile.path);
    bannerFiles.forEach(f => {
      if (f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });
  };

  try {
    const currentRow = await db.queryOne(
      'SELECT id, banner_file_ids FROM tools WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (!currentRow) {
      cleanupTemp();
      res.status(404).json({ success: false, message: 'Tool not found' });
      return;
    }

    const existingBannerIds: string[] = Array.isArray(currentRow.banner_file_ids)
      ? currentRow.banner_file_ids
      : [];

    if (logoFile) {
      const savedLogoName = await saveProfilePicture(logoFile.filename);
      const fileRow = await db.queryOne(
        'INSERT INTO files (key, size, mime_type) VALUES ($1, $2, $3) RETURNING id',
        [savedLogoName, logoFile.size, logoFile.mimetype]
      );
      updates.logo_file_id = fileRow.id;
    }

    const hasKeepField = typeof keepBannerRaw !== 'undefined';
    if (hasKeepField || bannerFiles.length > 0) {
      let nextBanners = [...existingBannerIds];

      if (hasKeepField) {
        const keepStr = typeof keepBannerRaw === 'string' ? keepBannerRaw : String(keepBannerRaw);
        let keepParsed: unknown;
        try {
          keepParsed = JSON.parse(keepStr);
        } catch {
          cleanupTemp();
          res.status(400).json({ success: false, message: 'keep_banner_file_ids must be a JSON array' });
          return;
        }
        if (!Array.isArray(keepParsed)) {
          cleanupTemp();
          res.status(400).json({ success: false, message: 'keep_banner_file_ids must be a JSON array' });
          return;
        }
        const valid = new Set(existingBannerIds);
        nextBanners = keepParsed
          .map((x) => String(x))
          .filter((bid) => valid.has(bid));
      }

      if (bannerFiles.length > 0) {
        const newIds: string[] = [];
        for (const file of bannerFiles) {
          const savedBannerName = await saveProfilePicture(file.filename);
          const fileRow = await db.queryOne(
            'INSERT INTO files (key, size, mime_type) VALUES ($1, $2, $3) RETURNING id',
            [savedBannerName, file.size, file.mimetype]
          );
          newIds.push(fileRow.id);
        }
        nextBanners = [...nextBanners, ...newIds].slice(0, 5);
      }

      updates.banner_file_ids = nextBanners;
    }

    const fields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        params.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      res.status(400).json({ success: false, message: 'No fields to update' });
      return;
    }

    params.push(id);
    const tool = await db.queryOne(
      `UPDATE tools SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramCount} AND deleted_at IS NULL
       RETURNING *`,
      params
    );

    if (!tool) {
      cleanupTemp();
      res.status(404).json({ success: false, message: 'Tool not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: tool,
    });
  } catch (error) {
    cleanupTemp();
    throw error;
  }
};
