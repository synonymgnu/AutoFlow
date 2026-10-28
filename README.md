# Loja de estética automotiva (loja única, pronta para virar SaaS)

## Rodar
1. `cp .env.example .env` e preencha (Neon, Google, Resend, AUTH_SECRET, OWNER_EMAIL)
2. `npm install`
3. `npx prisma migrate dev --name init`
4. `npm run db:seed` (cria a loja e o convite OWNER; copie o STORE_ID para o .env)
5. `npm run dev` → /login → /painel

Google OAuth: callback `http://localhost:3000/api/auth/callback/google`.

## O que já existe (Etapas 1 e parte da 2)
Login só para convidados, painel protegido no servidor, cadastro de produto com
variante, publicar/despublicar e vitrine pública.

## Próximo (precisa de migration nova)
Categorias no painel, upload de imagens, carrinho, checkout/WhatsApp, Customer/Address/Order/
Payment/Coupon/StockMovement (schema completo está no documento), Mercado Pago.

## Atenção
- Prisma 6. No Prisma 7 a URL vai para prisma.config.ts.
- Toda página/ação do painel começa com `requireStoreRole()`.
- Para virar SaaS, altere só `src/lib/store.ts`.
