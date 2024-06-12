export function nameVarify(name: string) {
  const nameReg = /^[\u4e00-\u9fa5a-zA-Z0-9!@#$%^&*()_+{}\[\]:;<>,.?~\-\/\\|=]+$/;
  if (name.length === 0) {
    return false
  }
  if (!nameReg.test(name)) {
    return false
  }
  if (name.length > 16 || name.length < 2) {
    return false
  }
  return true
}

export function passwordVarify(password: string) {
  const passwordReg = /^[a-zA-Z0-9_-]+$/
  if (password.length === 0) {
    return false
  }
  if (password.length < 6 || password.length > 16) {
    return false
  }
  if (!passwordReg.test((password))) {
    return false
  }
  return true
}