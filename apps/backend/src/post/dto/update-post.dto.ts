import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto';

// El dueño de un post no se puede cambiar al editarlo.
export class UpdatePostDto extends PartialType(CreatePostDto) {}
