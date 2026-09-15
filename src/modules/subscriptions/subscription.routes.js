const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../../core/middlewares');
const { validate } = require('../../core/middlewares/validate.middleware');
const { ROLES } = require('../../core/constants/roles');
const controller = require('./subscription.controller');
const schemas = require('./subscription.validation');

const operationalRoles = [ROLES.ADMIN, ROLES.VET, ROLES.USER, ROLES.SUPER_ADMIN];
const administrativeRoles = [ROLES.ADMIN, ROLES.SUPER_ADMIN];

router.use(authMiddleware);

router.get('/veterinary-plans', authorize(...operationalRoles), controller.listPlans);
router.get('/veterinary-plans/:id', authorize(...operationalRoles), validate(schemas.singleIdParams, 'params'), controller.getPlan);
router.post('/veterinary-plans', authorize(...administrativeRoles), validate(schemas.planBody), controller.createPlan);
router.patch('/veterinary-plans/:id', authorize(...administrativeRoles), validate(schemas.singleIdParams, 'params'), validate(schemas.planUpdateBody), controller.updatePlan);
router.patch('/veterinary-plans/:id/status', authorize(...administrativeRoles), validate(schemas.singleIdParams, 'params'), validate(require('joi').object({ status: require('joi').string().valid('ACTIVE', 'INACTIVE').required() }), 'body'), controller.setPlanStatus);

router.get('/veterinary-subscriptions', authorize(...operationalRoles), validate(schemas.subscriptionQuery, 'query'), controller.listSubscriptions);
router.get('/veterinary-subscriptions/:id', authorize(...operationalRoles), validate(schemas.singleIdParams, 'params'), controller.getSubscription);
router.post('/veterinary-subscriptions', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER, ROLES.SUPER_ADMIN), validate(schemas.subscriptionBody), controller.createSubscription);
router.patch('/veterinary-subscriptions/:id', authorize(...administrativeRoles), validate(schemas.singleIdParams, 'params'), validate(schemas.subscriptionUpdateBody), controller.updateSubscription);
router.post('/veterinary-subscriptions/:id/pets/:petId', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER, ROLES.SUPER_ADMIN), validate(schemas.petParams, 'params'), controller.addPet);
router.delete('/veterinary-subscriptions/:id/pets/:petId', authorize(...administrativeRoles), validate(schemas.petParams, 'params'), controller.removePet);
router.post('/veterinary-subscriptions/:id/suspend', authorize(...administrativeRoles), validate(schemas.singleIdParams, 'params'), controller.suspend);
router.post('/veterinary-subscriptions/:id/reactivate', authorize(...administrativeRoles), validate(schemas.singleIdParams, 'params'), controller.reactivate);

router.get('/subscription-installments/client/:clientId', authorize(...operationalRoles), validate(schemas.clientIdParams, 'params'), validate(schemas.installmentQuery, 'query'), controller.listInstallments);
router.get('/subscription-installments/subscription/:subscriptionId', authorize(...operationalRoles), validate(schemas.subscriptionIdParams, 'params'), validate(schemas.installmentQuery, 'query'), controller.listInstallments);
router.post('/subscription-installments/subscription/:subscriptionId/generate', authorize(...operationalRoles), validate(schemas.subscriptionIdParams, 'params'), validate(schemas.generateBody), controller.generateInstallments);
router.get('/clients/:clientId/subscription-summary', authorize(...operationalRoles), validate(schemas.clientIdParams, 'params'), controller.clientSummary);
router.get('/subscription-installments/admin/monthly-summary', authorize(...administrativeRoles), validate(schemas.monthQuery, 'query'), controller.monthlySummary);
router.post('/subscription-installments/prepare-pos', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER, ROLES.SUPER_ADMIN), validate(schemas.preparePosBody), controller.preparePos);
router.get('/subscription-installments/:id', authorize(...operationalRoles), validate(schemas.singleIdParams, 'params'), controller.listInstallments);

module.exports = router;
