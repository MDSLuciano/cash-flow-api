import { FastifyInstance } from 'fastify';
import {z} from 'zod';
import { prisma } from '../lib/prisma';
import { TransactionCategory, TransactionPaymentMethod, TransactionType } from '@prisma/client';

interface Transaction {
	id: number
	title: string
	amount: number
	type: TransactionType
	category: TransactionCategory
	paymentMethod: TransactionPaymentMethod
}

const transactions: Transaction[] = [];


export async function transactionRoutes(app: FastifyInstance){
	// Responsável por criar uma transação.
    app.post('/', async (request, reply) =>{

	  // Define o esquema de validação para o corpo da requisição
	  const createTransactionBodySchema = z.object({
		title: z.string().min(1),
		amount: z.number().positive(),
		type:z.enum(['credit', 'debit']),
		category: z.enum(['HOUSING','TRANSPORTATION','FOOD','ENTERTAINMENT','HEALTH','UTILITY','SALARY','EDUCATION','OTHER']),  
		paymentMethod: z.enum(['OTHER','CREDIT_CARD','DEBIT_CARD','BANK_TRANSFER','BANK_SLIP','CASH','PIX'])
	  })

		// Extrai os dados da transação da requisição e valida com o esquema
		const { title, amount, type, category, paymentMethod } = createTransactionBodySchema.parse(request.body)

		// Adiciona a nova transação ao array de transações
		await prisma.transaction.create({
			data:{
				title,
				amount,
				type,
				category,
				paymentMethod
			}
		})

		// Retorna uma resposta com o código 201 (created)
    	reply.status(201).send()
    })

	// Responsável por listar a transação.
    app.get('/', async(request, reply) =>{ 
		
		const transactions = await prisma.transaction.findMany()

		// Retorna o array de transações dentro de um objeto como resposta
        reply.send({ transactions })
    })

	// Responsável por listar uma transação específica.
    app.get('/:id', async(request, reply) =>{
			// Define o esquema de validação para os parâmetros da rota
			const getTransactionParamsSchema = z.object({
				id: z.coerce.number()
			})

			// Extrai o id da transação dos parâmetros da rota da requisição e valida com o esquema
			const { id } =getTransactionParamsSchema.parse(request.params)

			// Busca a transação pelo id
			const transaction = await prisma.transaction.findUnique({
				where: {
					id
				}
			})

			// Se a transação não for encontrada, retorna um erro 404
			if(!transaction) {
				return reply.status(404).send({ error: 'Transaction not found' })
			}

			// Retorna a transação encontrada
			return reply.send({ transaction })
    })
	// Responsável por alterar uma transação específica
	app.put('/:id', async(request, reply) =>{
			// Define o esquema de validação para os parâmetros da rota
		const updateTransactionParamsSchema = z.object({
			id: z.coerce.number()
		})

		// Define o esquema de validação para o corpo da requisição
		const updateTransactionBodySchema = z.object({
				title: z.string().min(1),
				amount: z.number().positive(),
				type:z.enum(['credit', 'debit']),
				category: z.enum(['HOUSING','TRANSPORTATION','FOOD','ENTERTAINMENT','HEALTH','UTILITY','SALARY','EDUCATION','OTHER']),  
				paymentMethod: z.enum(['OTHER','CREDIT_CARD','DEBIT_CARD','BANK_TRANSFER','BANK_SLIP','CASH','PIX'])
	  	})

			// Extrai o id da transação dos parâmetros da rota da requisição e valida com o esquema.
			const { id } = updateTransactionParamsSchema.parse(request.params)

			// Extrai os dados da transação do corpo da requisição e valida com o esquema
			const { title, amount, type, category, paymentMethod } = updateTransactionBodySchema.parse(request.body)

			// Encontra a transação com o ID
			const transaction = await prisma.transaction.findUnique({
				where: {
					id
				}
			})

			// Se a transação não for encontrada, retorna um erro 404
			if(!transaction){
				return reply.status(404).send({ error: 'Transaction not found' })
			}

			//Atualiza a transação no banco de dados
			await prisma.transaction.update({
				where: {
					id
				},
				data: {
					title,
					amount,
					type,
					category,
					paymentMethod
				},
			})

			// Retorna uma resposta com o código 200 (OK)
			return reply.send()
		})

	app.get('/transactions', async (request, reply) => {
    	const getTransactionsQuerySchema = z.object({
      	limit: z.coerce.number().min(10).max(100).default(10),
      	page: z.coerce.number().min(1).default(1)
    	})

    	const { limit, page } = getTransactionsQuerySchema.parse(request.query)


    	// Busca todas as transações no banco de dados
    	const transactions = await prisma.transaction.findMany({
      	orderBy: {
        	id: 'desc'
      	},
      	take: limit,
      	skip: (page - 1) * limit,
    })

    const totalTransactions = await prisma.transaction.count()

    // Retorna o array de transações dentro de um objeto como resposta
    return reply.send({ 
      	transactions,
      	page,
      	limit,
      	totalPages: Math.ceil(totalTransactions / limit)
    	})
  	})

	// Responsável por deletar uma transação específica.
	app.delete('/:id', async(request, reply) =>{
		// Define o esquema de validação para os parâmetros da rota
		const deleteTransactionParamsSchema = z.object({
			id: z.coerce.number()
		})

		// Extrai o índice da transação dos parâmetros da rota da requisição e valida com o esquema
		const { id } = deleteTransactionParamsSchema.parse(request.params)

		// Deleta a transação do banco de dados
		const transaction = await prisma.transaction.delete({
			where: {
				id
			}
		})

		// Se a transação não for encontrada, retorna um erro 404
		if(!transaction){
			return reply.status(404).send({ error: 'Transaction not found' })
		}

		// Retorna uma resposta de sucesso
		return reply.status(204).send() // Status 204 indica que a operação foi bem-sucedida sem conteúdo de retorno.
		})
	//	Responsável por retornar um resumo das transações.
	app.get('/summary', async(request, reply)=>{
		// Busca a soma de todas as transações de crédito
		let aggregations = await prisma.transaction.aggregate({
			_sum: {
				amount: true,
			},
			where: {
				type: 'credit'
			},
		})

		const totalCredit = aggregations._sum.amount ?? 0

		// Busca a soma de todas as transações de débito
		aggregations = await prisma.transaction.aggregate({
			_sum: {
				amount: true,
			},
			where: {
				type: 'debit'
			},
		})

		const totalDebit = aggregations._sum.amount ?? 0

		// Retorna o resumo das transações
		return reply.send({
			summary: {
				totalCredit,
				totalDebit,
				netBalance: totalCredit - totalDebit
			}
		})
	})
}