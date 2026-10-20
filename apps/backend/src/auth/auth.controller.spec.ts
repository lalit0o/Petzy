import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/signIn.dto';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    singUp: jest.fn(),
    signIn: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('passes sign-in credentials to the service without logging them', async () => {
    const credentials: SignInDto = {
      email: 'ana@example.com',
      password: 'secret-password',
    };
    const response = { access_token: 'test-token' };
    authService.signIn.mockResolvedValue(response);
    const log = jest.spyOn(console, 'log').mockImplementation();

    try {
      await expect(controller.signIn(credentials)).resolves.toBe(response);
      expect(authService.signIn).toHaveBeenCalledWith(credentials);
      expect(log).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });
});
