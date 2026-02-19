/**
 * Testes automatizados — Sistema de Entregas
 * Roda com: npm test
 */

const request = require("supertest");
const app = require("./server");

// ──────────────────────────────────────────
// ENTREGAS
// ──────────────────────────────────────────
describe("Entregas", () => {

  test("GET /entregas — deve retornar lista paginada", async () => {
    const res = await request(app)
      .get("/entregas?motorista=admin");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test("POST /entregas — deve criar uma entrega com dados válidos", async () => {
    const res = await request(app)
      .post("/entregas")
      .send({ cliente: "Cliente Teste", endereco: "Rua Teste, 123, São Paulo" });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("id");
  });

  test("POST /entregas — deve rejeitar entrega sem cliente", async () => {
    const res = await request(app)
      .post("/entregas")
      .send({ endereco: "Rua Teste, 123" });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("erro");
  });

  test("POST /entregas — deve rejeitar entrega sem endereço", async () => {
    const res = await request(app)
      .post("/entregas")
      .send({ cliente: "Cliente Teste" });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("erro");
  });

  test("DELETE /entregas/:id — deve retornar 404 para ID inexistente", async () => {
    const res = await request(app).delete("/entregas/999999");
    expect(res.statusCode).toBe(404);
  });

});

// ──────────────────────────────────────────
// FLUXO DE COLETA E FINALIZAÇÃO
// ──────────────────────────────────────────
describe("Fluxo de coleta", () => {

  let entregaId;

  beforeEach(async () => {
    // Cria uma entrega fresca antes de cada teste
    const res = await request(app)
      .post("/entregas")
      .send({ cliente: "Teste Fluxo", endereco: "Av. Brasil, 456, SP" });
    entregaId = res.body.id;
  });

  test("PUT /entregas/:id/coletar — deve coletar entrega pendente", async () => {
    const res = await request(app)
      .put(`/entregas/${entregaId}/coletar`)
      .send({ motorista: "motorista_teste" });

    expect(res.statusCode).toBe(200);
    expect(res.body.sucesso).toBe(true);
  });

  test("PUT /entregas/:id/coletar — deve rejeitar sem motorista", async () => {
    const res = await request(app)
      .put(`/entregas/${entregaId}/coletar`)
      .send({});

    expect(res.statusCode).toBe(400);
  });

  test("PUT /entregas/:id/finalizar — deve finalizar entrega coletada", async () => {
    // Primeiro coleta
    await request(app)
      .put(`/entregas/${entregaId}/coletar`)
      .send({ motorista: "motorista_teste" });

    // Depois finaliza
    const res = await request(app)
      .put(`/entregas/${entregaId}/finalizar`);

    expect(res.statusCode).toBe(200);
    expect(res.body.sucesso).toBe(true);
  });

});

// ──────────────────────────────────────────
// ESTATÍSTICAS
// ──────────────────────────────────────────
describe("Stats", () => {

  test("GET /stats — deve retornar contagens", async () => {
    const res = await request(app).get("/stats");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("total");
    expect(res.body).toHaveProperty("pendentes");
    expect(res.body).toHaveProperty("coletadas");
    expect(res.body).toHaveProperty("finalizadas");
  });

});

// ──────────────────────────────────────────
// MOTORISTAS
// ──────────────────────────────────────────
describe("Motoristas", () => {

  test("GET /motoristas — deve retornar lista", async () => {
    const res = await request(app).get("/motoristas");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("POST /cadastro — deve cadastrar motorista com dados válidos", async () => {
    const nome = `motorista_${Date.now()}`;
    const res = await request(app)
      .post("/cadastro")
      .send({ nome, senha: "senha123" });

    expect(res.statusCode).toBe(201);
  });

  test("POST /cadastro — deve rejeitar nome duplicado", async () => {
    const nome = `dup_${Date.now()}`;
    await request(app).post("/cadastro").send({ nome, senha: "senha123" });
    const res = await request(app).post("/cadastro").send({ nome, senha: "outrasenha" });

    expect(res.statusCode).toBe(409);
  });

  test("POST /cadastro — deve rejeitar sem senha", async () => {
    const res = await request(app)
      .post("/cadastro")
      .send({ nome: "sem_senha" });

    expect(res.statusCode).toBe(400);
  });

  test("DELETE /motoristas/:id — deve retornar 404 para ID inexistente", async () => {
    const res = await request(app).delete("/motoristas/999999");
    expect(res.statusCode).toBe(404);
  });

});

// ──────────────────────────────────────────
// LOGIN
// ──────────────────────────────────────────
describe("Login", () => {

  test("POST /login — deve rejeitar credenciais inválidas", async () => {
    const res = await request(app)
      .post("/login")
      .send({ nome: "naoexiste", senha: "errada" });

    expect(res.statusCode).toBe(401);
  });

  test("POST /login — deve rejeitar sem campos", async () => {
    const res = await request(app).post("/login").send({});
    expect(res.statusCode).toBe(400);
  });

});
