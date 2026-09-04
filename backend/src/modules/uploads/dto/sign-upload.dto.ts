import { IsInt, IsMimeType, IsString, Max, Min } from 'class-validator';

export class SignUploadDto {
  @IsString()
  folder!: string;

  @IsString()
  filename!: string;

  @IsMimeType()
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024)
  fileSize!: number;
}
