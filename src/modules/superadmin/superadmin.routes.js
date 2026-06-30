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

module.exports = router;
