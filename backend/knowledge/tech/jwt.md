# JWT — JSON Web Tokens

## O que é JWT
JWT (JSON Web Token) é um padrão para transmitir informações de forma segura entre partes como um objeto JSON assinado digitalmente.

## Estrutura do JWT
Um JWT tem 3 partes separadas por ponto:
header.payload.signature

Exemplo:
eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwiZW1haWwiOiJ1c2VyQGVtYWlsLmNvbSJ9.assinatura

### Header (algoritmo)
{ "alg": "HS256", "typ": "JWT" }

### Payload (dados)
{
  "id": 1,
  "email": "user@email.com",
  "role": "admin",
  "iat": 1716000000,
  "exp": 1716086400
}

### Signature
HMACSHA256(base64(header) + "." + base64(payload), SECRET_KEY)

## Gerar JWT no Node.js
import jwt from 'jsonwebtoken'

const token = jwt.sign(
  { id: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
)

## Verificar JWT no Node.js
import jwt from 'jsonwebtoken'

try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET)
  console.log(decoded.id, decoded.email)
} catch (error) {
  if (error.name === 'TokenExpiredError') // token expirado
  if (error.name === 'JsonWebTokenError')  // token inválido
}

## Middleware de autenticação no Express
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token necessário' })
  }
  try {
    const token = auth.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch(e) {
    return res.status(401).json({ error: 'Token inválido ou expirado' })
  }
}

// Uso nas rotas
app.get('/api/profile', authMiddleware, (req, res) => {
  res.json({ user: req.user })
})

## Enviar JWT no frontend
// Salvar no localStorage
localStorage.setItem('token', data.token)

// Usar nas requisições
const token = localStorage.getItem('token')
const res = await fetch('/api/profile', {
  headers: { Authorization: 'Bearer ' + token }
})

## Refresh Token
Access token: curto prazo (15min a 1h)
Refresh token: longo prazo (7 a 30 dias), usado para gerar novo access token

const accessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' })
const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' })

## Boas práticas
- Nunca armazenar dados sensíveis no payload (senha, cartão)
- JWT_SECRET deve ser uma string longa e aleatória (mínimo 32 chars)
- Usar HTTPS sempre para transmitir tokens
- Invalidar tokens no logout guardando lista de tokens revogados
- Preferir HttpOnly cookies em vez de localStorage para maior segurança
- Access token curto + refresh token longo é o padrão mais seguro

## JWT no Supabase
O Supabase gera JWTs automaticamente. O token contém:
{
  "sub": "uuid-do-usuario",
  "email": "user@email.com",
  "role": "authenticated",
  "user_metadata": { "name": "João", "plan": "pro" },
  "exp": 1716086400
}

Para verificar token Supabase no backend:
const { data: { user }, error } = await supabase.auth.getUser(token)
