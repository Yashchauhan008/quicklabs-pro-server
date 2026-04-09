import express from 'express';
import WithDatabase from '@utils/withDatabase';
import { validate } from '@utils/validationHelper';
import { requireRole } from '@middleware/auth/requireRole';
import privateRoute from '@middleware/auth/privateRoute';
import imageUpload from '@middleware/multer/imageUpload';
import { createSubjectRouter } from './subject.route';
import { createDocumentRouter } from './document.route';

import {
  ValidationSchema as UpdateProfileValidationSchema,
  Controller as UpdateProfileController,
} from '../components/student/updateProfile';

import {
  ValidationSchema as RateDocumentValidationSchema,
  Controller as RateDocumentController,
} from '../components/rating/rateDocument';

import {
  ValidationSchema as RateStudentValidationSchema,
  Controller as RateStudentController,
} from '../components/rating/rateStudent';

import {
  ValidationSchema as GetPeerProfileValidationSchema,
  Controller as GetPeerProfileController,
} from '../components/student/getPeerProfile';

import {
  ValidationSchema as CreateEnquiryValidationSchema,
  Controller as CreateEnquiryController,
} from '../components/enquiry/createEnquiry';

import {
  ValidationSchema as ListEnquiriesValidationSchema,
  Controller as ListEnquiriesController,
} from '../components/enquiry/listEnquiries';
import {
  ValidationSchema as VoteEnquiryValidationSchema,
  Controller as VoteEnquiryController,
} from '../components/enquiry/voteEnquiry';
import {
  ValidationSchema as DeleteEnquiryValidationSchema,
  Controller as DeleteEnquiryController,
} from '../components/enquiry/deleteEnquiry';

import {
  ValidationSchema as AddPeerBookmarkValidationSchema,
  Controller as AddPeerBookmarkController,
} from '../components/student/addPeerBookmark';

import {
  ValidationSchema as RemovePeerBookmarkValidationSchema,
  Controller as RemovePeerBookmarkController,
} from '../components/student/removePeerBookmark';

import {
  ValidationSchema as ListPeerBookmarksValidationSchema,
  Controller as ListPeerBookmarksController,
} from '../components/student/listPeerBookmarks';

import { Controller as UploadProfilePictureController } from '../components/student/uploadProfilePicture';
import { Controller as DeleteProfilePictureController } from '../components/student/deleteProfilePicture';

const router = express.Router();

router.post(
  '/profile/picture',
  privateRoute,
  requireRole('student'),
  imageUpload.single('file'),
  WithDatabase(UploadProfilePictureController)
);

router.delete(
  '/profile/picture',
  privateRoute,
  requireRole('student'),
  WithDatabase(DeleteProfilePictureController)
);

router.patch(
  '/profile',
  privateRoute,
  requireRole('student'),
  validate(UpdateProfileValidationSchema),
  WithDatabase(UpdateProfileController)
);

router.post(
  '/ratings/documents/:document_id',
  privateRoute,
  requireRole('student'),
  validate(RateDocumentValidationSchema),
  WithDatabase(RateDocumentController)
);

router.post(
  '/ratings/students/:student_id',
  privateRoute,
  requireRole('student'),
  validate(RateStudentValidationSchema),
  WithDatabase(RateStudentController)
);

router.get(
  '/peers/:student_id',
  privateRoute,
  requireRole('student'),
  validate(GetPeerProfileValidationSchema),
  WithDatabase(GetPeerProfileController)
);

router.get(
  '/bookmarks',
  privateRoute,
  requireRole('student'),
  validate(ListPeerBookmarksValidationSchema),
  WithDatabase(ListPeerBookmarksController)
);

router.post(
  '/bookmarks/:peer_id',
  privateRoute,
  requireRole('student'),
  validate(AddPeerBookmarkValidationSchema),
  WithDatabase(AddPeerBookmarkController)
);

router.delete(
  '/bookmarks/:peer_id',
  privateRoute,
  requireRole('student'),
  validate(RemovePeerBookmarkValidationSchema),
  WithDatabase(RemovePeerBookmarkController)
);

router.post(
  '/enquiries',
  privateRoute,
  requireRole('student'),
  validate(CreateEnquiryValidationSchema),
  WithDatabase(CreateEnquiryController)
);

router.get(
  '/enquiries',
  privateRoute,
  validate(ListEnquiriesValidationSchema),
  WithDatabase(ListEnquiriesController)
);

router.post(
  '/enquiries/:enquiry_id/votes',
  privateRoute,
  validate(VoteEnquiryValidationSchema),
  WithDatabase(VoteEnquiryController)
);

router.delete(
  '/enquiries/:enquiry_id',
  privateRoute,
  validate(DeleteEnquiryValidationSchema),
  WithDatabase(DeleteEnquiryController)
);

router.use('/subjects', createSubjectRouter(requireRole('student')));
router.use('/documents', createDocumentRouter(requireRole('student')));

export default router;
