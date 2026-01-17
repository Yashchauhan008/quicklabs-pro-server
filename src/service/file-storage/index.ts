import fsp from 'fs/promises';
import fs from 'fs';
import path from 'path';
import constant from '@config/constant';
import ServerError from '@utils/serverError';

const fileStoragePath = constant.fileStoragePath;
const temporaryFileStoragePath = constant.temporaryFileStoragePath;

// Ensure storage directory exists
if (!fs.existsSync(fileStoragePath)) {
  fs.mkdirSync(fileStoragePath, { recursive: true });
}

export const upload = async (filePath: string): Promise<string> => {
  const isFileExists = fs.existsSync(filePath);
  if (!isFileExists) {
    throw new ServerError('NOT_FOUND', 'File not found');
  }
  
  const fileName = path.basename(filePath);
  const destinationPath = path.join(fileStoragePath, fileName);
  
  await fsp.rename(filePath, destinationPath);
  return fileName;
};

export const saveFile = async (fileName: string): Promise<string> => {
  const existingFilePath = path.join(temporaryFileStoragePath, fileName);
  await upload(existingFilePath);
  return fileName;
};

export const deleteFile = async (filename: string): Promise<void> => {
  const filePath = path.join(fileStoragePath, filename);
  if (fs.existsSync(filePath)) {
    await fsp.unlink(filePath);
  }
};

export const replaceOldFile = async (oldFileName: string, newFileName: string): Promise<string> => {
  if (!newFileName) return oldFileName;
  if (oldFileName === newFileName) return newFileName;
  
  await saveFile(newFileName);
  
  // Delete old file
  if (oldFileName) {
    try {
      await deleteFile(oldFileName);
    } catch (error) {
      // Log error but don't throw - new file is already saved
      console.error('Error deleting old file:', error);
    }
  }
  
  return newFileName;
};

export const getFilePath = (filename: string): string => {
  return path.join(fileStoragePath, filename);
};