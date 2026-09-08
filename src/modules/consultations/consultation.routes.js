
const express = require('express');
const router = express.Router();
const { authMiddleware, authorize, validate } = require('../../core/middlewares');
const { ROLES } = require('../../core/constants/roles');
const schemas = require('../../validators/consultation.schema');
const idempotency = require('../../core/idempotency/idempotency.middleware');
const controller = require('./consultation.controller');

router.use(authMiddleware);
router.post('/', controller.create);
router.get('/queue', controller.getQueue);
router.get('/', controller.getAll);
router.get('/pet/:petId/history', controller.getPetHistory);
router.get('/client/:clientId', controller.getClientConsultations);
router.patch('/:id/consultorio', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER), validate(schemas.assignConsultorioSchema), controller.assignConsultorio);
router.delete('/:id/consultorio', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER), validate(schemas.consultationIdSchema), controller.releaseConsultorio);
router.get('/:id', controller.getById);
router.post('/:id/close', idempotency('POST /consultations/:id/close'), controller.close);
router.post('/:id/diagnoses', controller.addDiagnosis);
router.post('/:id/treatments', controller.addTreatment);
router.post('/:id/prescriptions', controller.addPrescription);
router.put('/:id', controller.update);

module.exports = router;

