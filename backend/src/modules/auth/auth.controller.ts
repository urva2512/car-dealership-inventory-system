import type { RequestHandler } from 'express';
import { AuthService } from './auth.service.js';
import type { LoginInput, RegisterInput } from './auth.validation.js';

const authService = new AuthService();

export const register: RequestHandler = async (request, response, next) => {
  try {
    const result = await authService.register(request.body as RegisterInput);
    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const login: RequestHandler = async (request, response, next) => {
  try {
    const result = await authService.login(request.body as LoginInput);
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const createAdmin: RequestHandler = async (request, response, next) => {
  try {
    const user = await authService.createAdmin(request.body as RegisterInput);
    response.status(201).json(user);
  } catch (error) {
    next(error);
  }
};
