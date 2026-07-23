const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../../core/middlewares');
const { ROLES } = require('../../core/constants/roles');
const controller = require('./superadmin.controller');

router.use(authMiddleware);

// Plans
router.get('/plans', authorize(ROLES.SUPER_ADMIN), controller.getPlans);
router.get('/plans/:id', authorize(ROLES.SUPER_ADMIN), controller.getPlanById);
router.post('/plans', authorize(ROLES.SUPER_ADMIN), controller.createPlan);
router.put('/plans/:id', authorize(ROLES.SUPER_ADMIN), controller.updatePlan);
router.delete('/plans/:id', authorize(ROLES.SUPER_ADMIN), controller.deletePlan);

// Subscriptions
router.get('/subscriptions', authorize(ROLES.SUPER_ADMIN), controller.getSubscriptions);
router.get('/subscriptions/:id', authorize(ROLES.SUPER_ADMIN), controller.getSubscriptionById);
router.post('/subscriptions', authorize(ROLES.SUPER_ADMIN), controller.createSubscription);
router.put('/subscriptions/:id', authorize(ROLES.SUPER_ADMIN), controller.updateSubscription);
router.delete('/subscriptions/:id', authorize(ROLES.SUPER_ADMIN), controller.deleteSubscription);
// Subscriptions by organization
router.get('/subscriptions/organization/:organizationId', authorize(ROLES.SUPER_ADMIN), controller.getSubscriptionsByOrganization);
// Clinics
router.post('/clinics', authorize(ROLES.SUPER_ADMIN), controller.createClinic);
router.get('/clinics/:id', authorize(ROLES.SUPER_ADMIN), controller.getClinicById);
router.get('/clinics/organization/:organizationId', authorize(ROLES.SUPER_ADMIN), controller.getClinicsByOrganization);
router.put('/clinics/:id', authorize(ROLES.SUPER_ADMIN), controller.updateClinic);
router.delete('/clinics/:id', authorize(ROLES.SUPER_ADMIN), controller.deleteClinic);
// Associate clinic to plan
router.post('/organization', authorize(ROLES.SUPER_ADMIN), controller.createOrganization);

router.post('/clinics/:clinicId/associate-plan/:planId', authorize(ROLES.SUPER_ADMIN), controller.associateClinicToPlan);
// Associate clinic to subscription
router.post('/clinics/:clinicId/associate-subscription/:subscriptionId', authorize(ROLES.SUPER_ADMIN), controller.associateClinicToSubscription);   


module.exports = router;
