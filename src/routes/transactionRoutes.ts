import { FastifyInstance } from 'fastify';

export async function transactionRoutes(app: FastifyInstance){
    app.post('/', async (request, reply) =>{
      // Responsável por criar uma transação.
        reply.send()
    })
    app.get('/', async(request, reply) =>{  
      // Responsável por listar a transação.
        reply.send()
    })
    app.get('/:id', async(request, reply) =>{
      // Responsável por listar uma transação específica.
    })
		app.put('/:id', async(request, reply) =>{
			// Responsável por alterar uma transação específica
		})
		app.delete('/:id', async(request, reply) =>{
			// Responsável por deletar uma transação específica.
		})
		app.get('/summary', async(request, reply)=>{
			//	Responsável por retornar um resumo das transações.
		})
}