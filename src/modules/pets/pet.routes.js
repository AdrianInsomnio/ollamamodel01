'use strict';
const express = require('express');
const router = express.Router();
const petController = require('./pet.controller');
const { authMiddleware } = require('../../core/middlewares/auth.middleware');

router.use(authMiddleware); // All pet routes require authentication

router.route('/')
  .post(petController.createPet)
  .get(petController.getPets);

router.route('/:id')
  .get(petController.getPet)
  .patch(petController.updatePet)
  .delete(petController.deletePet);

module.exports = router;
