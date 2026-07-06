'use strict';
const petService = require('./pet.service');
const { catchAsync } = require('../../utils/catchAsync');

exports.createPet = catchAsync(async (req, res) => {
  const petData = { ...req.body, organizationId: req.user.organizationId };
  const pet = await petService.createPet(petData);
  res.status(201).json({ status: 'success', data: { pet } });
});

exports.getPet = catchAsync(async (req, res) => {
  const pet = await petService.getPetById(req.params.id);
  res.status(200).json({ status: 'success', data: { pet } });
});

exports.getPets = catchAsync(async (req, res) => {
  const pets = await petService.getPets(req.query);
  res.status(200).json({ status: 'success', results: pets.length, data: { pets } });
});

exports.updatePet = catchAsync(async (req, res) => {
  // Remove organizationId from body to prevent changing ownership
  const { organizationId, ...petData } = req.body;
  const pet = await petService.updatePet(req.params.id, petData);
  res.status(200).json({ status: 'success', data: { pet } });
});

exports.deletePet = catchAsync(async (req, res) => {
  await petService.deletePet(req.params.id);
  res.status(204).json();
});
