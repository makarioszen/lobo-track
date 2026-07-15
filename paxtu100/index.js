const fastify = require('fastify')({ logger: true });
const { authenticate } = require('./auth-service');

// Register form body plugin for parsing JSON requests (default in Fastify)
// but we'll accept JSON from our API clients.

fastify.post('/login', async (request, reply) => {
    const { usuario, senha } = request.body || {};

    if (!usuario || !senha) {
        return reply.status(400).send({
            error: 'Campos "usuario" e "senha" são obrigatórios.',
        });
    }

    const result = await authenticate(usuario, senha);

    if (result.success) {
        return reply.send(result);
    } else {
        return reply.status(401).send(result);
    }
});

const start = async () => {
    try {
        await fastify.listen({ port: 3000, host: '0.0.0.0' });
        console.log(`Servidor rodando em http://localhost:3000`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
