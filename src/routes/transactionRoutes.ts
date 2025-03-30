import { FastifyInstance } from 'fastify';
import {z} from 'zod';


type TransactionCategory = 'HOUSING' | 'TRANSPORTATION' | 'FOOD' | 'ENTERTAINMENT' | 'HEALTH' | 'UTILITY' | 'SALARY' | 'EDUCATION' | 'OTHER';
type TransactionPaymentMethod = 'OTHER' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'BANK_SLIP' | 'CASH' | 'PIX';
interface Transaction {
	id: number
	title: string
	amount: number
	type: 'credit' | 'debit'
	category: TransactionCategory
	paymentMethod: TransactionPaymentMethod
}

const transactions: Transaction[] = [];

let currentId = 0

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
		const newTransaction: Transaction = {
			id: ++currentId,
			title,
			amount,
			type,
			category,
			paymentMethod
		}
		transactions.push(newTransaction)

		// Retorna uma resposta com o código 201 (created)
    reply.status(201).send()
    })

		// Responsável por listar a transação.
    app.get('/', async(request, reply) =>{  
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
			const transaction = transactions.find((transaction) => transaction.id === Number(id))

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

			// Encontra a transação com o ID fornecido
			let transaction = transactions.find((transaction) => transaction.id === Number(id))

			// Se a transação não for encontrada, retorna um erro 404
			if(!transaction){
				return reply.status(404).send({ error: 'Transaction not found' })
			}

			//Atualiza os dados da transação
			transaction.title = title;
			transaction.amount = amount;
			transaction.type = type;
			transaction.category = category;
			transaction.paymentMethod = paymentMethod;

			// Retorna uma resposta com o código 200 (OK)
			return reply.send()
		})
		// Responsável por deletar uma transação específica.
		app.delete('/:id', async(request, reply) =>{
			// Define o esquema de validação para os parâmetros da rota
			const deleteTransactionParamsSchema = z.object({
				id: z.coerce.number()
			})
			// Extrai o índice da transação dos parâmetros da rota da requisição e valida com o esquema
			const { id } = deleteTransactionParamsSchema.parse(request.params)
			// Encontra o índice da transação com o ID fornecido
			let index = transactions.findIndex((transaction) => transaction.id === Number(id))
			// Se a transação não for encontrada, retorna um erro 404
			if (index === -1){
				return reply.status(404).send({ error: 'Transaction not found' })
			}
			// Remove a transação do array
			transactions.splice(index, 1)
			// Retorna uma resposta de sucesso
			return reply.status(204).send()
		})
		//	Responsável por retornar um resumo das transações.
		app.get('/summary', async(request, reply)=>{
			let totalCredit = 0
			let totalDebit = 0

			// Itera sobre todas as transações e acumula os valores de acordo com o tipo
			transactions.forEach((transaction) => {
				if(transaction.type === 'credit'){
					totalCredit += transaction.amount
				}else if (transaction.type === 'debit'){
					totalDebit += transaction.amount
				}
			})

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