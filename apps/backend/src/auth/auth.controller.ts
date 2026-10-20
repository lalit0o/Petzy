import { Controller, Get, Post, Body, Param, Put, Req, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signUp.dto';
import { SignInDto } from './dto/signIn.dto';
import { Public } from './decorators/public.decorator';
import { AllowProfileSetup } from './decorators/allow-profile-setup.decorator';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { RefreshSessionDto } from './dto/refresh-session.dto';
import { EmailRequestDto } from './dto/email-request.dto';
import { PasswordUpdateDto } from './dto/password-update.dto';
import type { Request } from 'express';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Public()
  @Post('sign-up')
  signUp(@Body() createAuthDto: SignUpDto) {
    return this.authService.singUp(createAuthDto);
  }
  @Public()
  @Post('sign-in')
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshSessionDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  @Public()
  @Post('resend-confirmation')
  @HttpCode(200)
  resendConfirmation(@Body() dto: EmailRequestDto) {
    return this.authService.resendConfirmation(dto.email);
  }

  @Public()
  @Post('password-reset-request')
  @HttpCode(200)
  requestPasswordReset(@Body() dto: EmailRequestDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Public()
  @Post('password-update')
  @HttpCode(200)
  updatePassword(@Body() dto: PasswordUpdateDto) {
    return this.authService.updatePassword(dto);
  }

  @AllowProfileSetup()
  @Get('me')
  me(@Req() request: Request & { user: { id: string } }) {
    return this.authService.getAccountState(
      request.user.id,
      request.headers.authorization!.slice('Bearer '.length),
    );
  }

  @AllowProfileSetup()
  @Put('profile-completion')
  completeProfile(
    @Req() request: Request & { user: { id: string } },
    @Body() dto: CompleteProfileDto,
  ) {
    return this.authService.completeProfile(
      request.user.id,
      request.headers.authorization!.slice('Bearer '.length),
      dto,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.authService.findOne(+id);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateAuthDto: UpdateAuthDto) {
  //   return this.authService.update(+id, updateAuthDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.authService.remove(+id);
  // }
}
