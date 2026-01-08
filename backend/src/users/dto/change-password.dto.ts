import { IsEmail, IsNotEmpty } from "class-validator";

export class ChangePasswordDto {
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    oldPassword: string;

    @IsNotEmpty()
    newPassword: string;
}