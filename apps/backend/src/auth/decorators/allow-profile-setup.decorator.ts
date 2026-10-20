import { SetMetadata } from '@nestjs/common';

export const ALLOW_PROFILE_SETUP_KEY = 'allowProfileSetup';
export const AllowProfileSetup = () => SetMetadata(ALLOW_PROFILE_SETUP_KEY, true);
