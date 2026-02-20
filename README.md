# 🚚 Sistema de Entregas

Sistema web para gerenciamento de entregas de transportadora. Permite que administradores criem e acompanhem entregas, e que motoristas visualizem e coletem pedidos em tempo real.

---

## 📋 Funcionalidades

- **Painel Admin** — criar, visualizar, filtrar e excluir entregas com dashboard de estatísticas
- **Área do Motorista** — visualizar entregas disponíveis, coletar e finalizar com atualização automática a cada 30s
- **Cadastro de Motoristas** — admin pode cadastrar e excluir motoristas
- **Preenchimento automático de endereço** — integração com ViaCEP ao digitar o CEP
- **Cálculo de rota** — integração com OpenRouteService para distância e tempo estimado
- **Paginação** — listagem paginada para performance com muitos registros
- **Testes automatizados** — 16 testes cobrindo todas as rotas da API
- **CI/CD** — integração contínua via GitHub Actions

---

## 🛠 Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js + Express 5 |
| Banco de dados | SQLite3 (com WAL mode e índices) |
| Frontend | HTML + CSS + JavaScript vanilla |
| Testes | Jest + Supertest |
| CI/CD | GitHub Actions |
| APIs externas | ViaCEP, OpenRouteService |

---

## 🚀 Como rodar localmente

### Pré-requisitos
- [Node.js](https://nodejs.org) versão 18 ou superior

### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/cabralduu/sistema-entregas.git
cd sistema-entregas

# 2. Instale as dependências
npm install

# 3. Inicie o servidor
npm start
```

Acesse **http://localhost:3000** no navegador.

### Credenciais padrão
| Perfil | Usuário | Senha |
|--------|---------|-------|
| Admin | admin | 1234 |

---

## 🧪 Testes

```bash
npm test
```

Os testes cobrem todas as rotas da API: criação de entregas, coleta, finalização, cadastro de motoristas, login e estatísticas.

```
Test Suites: 1 passed
Tests:       16 passed
```

---

## 📁 Estrutura do projeto

```
sistema-entregas/
├── server.js           # API REST (backend)
├── server.test.js      # Testes automatizados
├── package.json        # Dependências e scripts
├── .github/
│   └── workflows/
│       └── ci.yml      # Pipeline de CI (GitHub Actions)
└── public/
    ├── login.html      # Tela de login
    ├── admin.html      # Painel do administrador
    ├── index.html      # Área do motorista
    └── motorista.html  # Página de cadastro
```

---

## 🔌 API — Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/entregas` | Lista entregas com paginação e filtro |
| POST | `/entregas` | Cria nova entrega |
| PUT | `/entregas/:id/coletar` | Motorista coleta entrega |
| PUT | `/entregas/:id/finalizar` | Motorista finaliza entrega |
| DELETE | `/entregas/:id` | Remove entrega |
| GET | `/stats` | Estatísticas do painel |
| POST | `/login` | Login do motorista |
| POST | `/login-admin` | Login do administrador |
| POST | `/cadastro` | Cadastra novo motorista |
| GET | `/motoristas` | Lista motoristas |
| DELETE | `/motoristas/:id` | Remove motorista |

---

## ☁️ Deploy

O sistema está preparado para deploy em plataformas como [Railway](https://railway.app) ou [Render](https://render.com), utilizando a variável de ambiente `PORT` automaticamente.
