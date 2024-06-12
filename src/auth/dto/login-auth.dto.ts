import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class LoginAuthDto {
  @MinLength(2, { message: '用户名不能少于2位' })
  @MaxLength(16, { message: '用户名不能多于16位' })
  @Matches(/^[\u4e00-\u9fa5a-zA-Z0-9!@#$%^&*()_+{}\[\]:;<>,.?~\-\/\\|=]+$/, { message: '用户名只能包含中文、字母、数字、字符' })
  @IsString()
  username: string;

  @MinLength(6, { message: '密码不能少于6位' })
  @MaxLength(16, { message: '密码不能多于16位' })
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: '密码只能包含字母、数字、下划线' })
  @IsString({ message: '密码必须为字符串' })
  password: string;
}
