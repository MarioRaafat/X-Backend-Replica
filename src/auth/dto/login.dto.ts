import { IsEmail, IsNotEmpty, Matches, MinLength } from "class-validator"

export class LoginDTO {
    @IsEmail()
    email: string
    
    @IsNotEmpty()
    @MinLength(8)
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, and one number or special character',
    })
    password: string
}