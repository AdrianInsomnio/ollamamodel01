  ## 📌 Resumen: Flujo completo actualizado del login

  [Frontend]
       ↓ POST /api/auth/login { email, password, rememberMe: true/false }

  [auth.controller.js]
       ↓ valida email y password
       ↓ extrae ip
       ↓ llama a authService.login(email, password, ip, rememberMe)

  [auth.service.js]
       ↓ llama a userRepository.findUserByEmail(email)
       ↓ si no existe → LOGIN_FAILED_EMAIL_NOT_FOUND → throw AppError(401)
       ↓ si existe → comparePassword(password, user.password)
       ↓ si no coincide → LOGIN_FAILED_WRONG_PASSWORD → throw AppError(401)
       ↓ si existe pero no tiene clínicas → LOGIN_FAILED_NO_CLINIC → throw AppError(403)
       ↓ si tiene clínicas → toma user.clinics[0].id como clinicId
       ↓ define expiresIn = rememberMe ? '30d' : '1d'
       ↓ genera token = jwt.sign({ id, username, email, clinicId, role }, JWT_SECRET, { expiresIn })
       ↓ devuelve { user: { id, username, email, role, clinics... (sin password) }, token }

  [auth.controller.js]
       ↓ recibe { user, token }
       ↓ establece header: X-Auth-Mode = env().authViaCookie ? 'cookie' : 'header'
       ↓ si authViaCookie:
             → llama a setAuthCookie(res, token)  // cookie HttpOnly, segura
             → devuelve { message: 'Login successful', user }
       ↓ si !authViaCookie:
             → devuelve { message: 'Login successful', token, user, organization }

  [Frontend]
       ↓ si modo cookie:
             → guarda nada (cookie HttpOnly enviada automáticamente por navegador)
             → redirige a /dashboard (o similar)
       ↓ si modo header:
             → guarda token en localStorage o cookie no HttpOnly
             → lo incluye en Authorization: Bearer <token> en cada petición protegida
             → redirige a /dashboard
