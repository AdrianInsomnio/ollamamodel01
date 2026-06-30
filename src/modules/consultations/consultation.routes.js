
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../core/middlewares/auth.middleware');
const idempotency = require('../../core/idempotency/idempotency.middleware');
const controller = require('./consultation.controller');

router.use(authMiddleware);
router.post('/', controller.create);
router.get('/', controller.getAll);
router.get('/pet/:petId/history', controller.getPetHistory);
router.get('/client/:clientId', controller.getClientConsultations);
router.get('/:id', controller.getById);
router.post('/:id/close', idempotency('POST /consultations/:id/close'), controller.close);
router.post('/:id/diagnoses', controller.addDiagnosis);
router.post('/:id/treatments', controller.addTreatment);
router.post('/:id/prescriptions', controller.addPrescription);
router.put('/:id', controller.update);

module.exports = router;

