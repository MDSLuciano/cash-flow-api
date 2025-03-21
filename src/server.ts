import fastify from 'fastify'
import { transactionRoutes } from './routes/transactionRoutes'

const app = fastify()
// Registrando a rota
app.register(transactionRoutes, { prefix: '/trnsactions' })

app.listen({ port: 3333 }).then(() => {
	console.log(`HTTP server running!`)
})