const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../../core/middlewares');
const { ROLES } = require('../../core/constants/roles');
const { validate } = require('../../validation/validate.middleware');
const controller = require('./printing.controller');
const validation = require('./printing.validation');

const admins = authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN);
router.use(authMiddleware);

router.get('/locations', admins, controller.listLocations);
router.post('/locations', admins, validate(validation.createLocation), controller.createLocation);
router.get('/agents', admins, controller.listAgents);
router.post('/agents', admins, validate(validation.createAgent), controller.createAgent);
router.get('/profiles', admins, controller.listProfiles);
router.post('/profiles', admins, validate(validation.createProfile), controller.createProfile);
router.get('/printers', admins, controller.listPrinters);
router.post('/printers', admins, validate(validation.createPrinter), controller.createPrinter);
router.get('/targets', admins, controller.listTargets);
router.post('/targets', admins, validate(validation.createTarget), controller.createTarget);
router.get('/templates', admins, controller.listTemplates);
router.post('/templates', admins, validate(validation.createTemplate), controller.createTemplate);
router.post('/templates/versions', admins, validate(validation.createTemplateVersion), controller.createTemplateVersion);
router.get('/assets', admins, controller.listAssets);
router.post('/assets', admins, validate(validation.createAsset), controller.createAsset);
router.get('/batches', controller.listBatches);
router.post('/batches', validate(validation.createBatch), controller.createBatch);

module.exports = router;
