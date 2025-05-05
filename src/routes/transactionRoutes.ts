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
		paymentMethod: z.enum(['OTHER','CREDIT_CARD','DEBIT_CARD','BANK_TRANSFER','BANK_SLIP','CASH','PIX']),
		transactionDate: z.string().refine((date) => {
			const parsedDate = Date.parse(date); // Verifica se a data é válida
			return !isNaN(parsedDate);
		}, { message: 'Invalid date format' }) // Valida a data no formato esperado
	})

	// Extrai os dados da transação da requisição e valida com o esquema
	const { title, amount, type, category, paymentMethod, transactionDate } = createTransactionBodySchema.parse(request.body)

	// Adiciona a nova transação ao array de transações
	await prisma.transaction.create({
		data:{
			title,
			amount,
			type,
			category,
			paymentMethod,
			transactionDate
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
			paymentMethod: z.enum(['OTHER','CREDIT_CARD','DEBIT_CARD','BANK_TRANSFER','BANK_SLIP','CASH','PIX']),
			transactionDate: z.string().refine((date) => {
				const parsedDate = Date.parse(date); // Verifica se a data é válida
				return !isNaN(parsedDate);
			}, { message: 'Invalid date format' }) // Valida a data no formato esperado
	})

		// Extrai o id da transação dos parâmetros da rota da requisição e valida com o esquema.
		const { id } = updateTransactionParamsSchema.parse(request.params)

		// Extrai os dados da transação do corpo da requisição e valida com o esquema
		const { title, amount, type, category, paymentMethod, transactionDate } = updateTransactionBodySchema.parse(request.body)

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
				paymentMethod,
				transactionDate,
			},
		})

		// Retorna uma resposta com o código 200 (OK)
		return reply.send()
	})

	app.get('/transactions', async (request, reply) => {
	const getTransactionsQuerySchema = z.object({
		limit: z.coerce.number().min(10).max(100).default(10),
		page: z.coerce.number().min(1).default(1),
		title: z.string().optional(),
		type: z.enum(['credit', 'debit']).optional(),
		day:z.coerce.number().optional(), // Filtro por dia é opcional
		month: z.coerce.number().optional(), // Filtro por mês é opcional
		year: z.coerce.number().optional(), // Filtro por ano é opcional
		startDate: z.string().optional(), // Filtro por data inicial
		endDate: z.string().optional(), // Filtro por data final
	})

	const { limit, page, title, type, day, month, year, startDate, endDate } = getTransactionsQuerySchema.parse(request.query)

	// Criação dinâmica do filtro
	const filters: any = {};

	// Passando o ano atual caso ele não passar, para fazer consulta o ano todo
	const currentYear = new Date().getFullYear();
	if (!year && !startDate && !endDate) {
		filters.transactionDate = {
			gte: new Date(`${currentYear}-01-01T00:00:00.000Z`).toISOString(), // Primeiro dia do ano atual
			lt: new Date(`${currentYear + 1}-01-01T00:00:00.000Z`).toISOString(), // Primeiro dia do próximo ano
		};
	}

	if (startDate && endDate) {
		filters.transactionDate = {
			gte: new Date(`${startDate.split('T')[0]}T00:00:00.000Z`).toISOString(), // Início do dia
			lt: new Date(`${endDate.split('T')[0]}T23:59:59.999Z`).toISOString(),   // Fim do dia
		};
	} else if (month && year) {
		const nextMonth = month === 12 ? 1 : month + 1;
    	const nextYear = month === 12 ? year + 1 : year;

    	filters.transactionDate = {
        	gte: new Date(`${year}-${String(month).padStart(2, '0')}-${day || '01'}T00:00:00.000Z`).toISOString(),
        	lt: new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-${day ? String(day + 1).padStart(2, '0') : '01'}T23:59:59.999Z`).toISOString(),
    	};
	} else if (year) {
		// Filtro para o ano inteiro
		filters.transactionDate = {
			gte: new Date(`${year}-01-01T00:00:00.000Z`).toISOString(), // Primeiro dia do ano
			lt: new Date(`${year + 1}-01-01T00:00:00.000Z`).toISOString(), // Primeiro dia do próximo ano
		};
	}

	if (type) {
		filters.type = type;
	}

	if (title) {
		filters.title = { 
			contains: title,
		 };
	}
	// Busca todas as transações no banco de dados
	const transactions = await prisma.transaction.findMany({
		where: filters,
		orderBy: {
			transactionDate: 'desc',
		},
		take: limit,
		skip: (page - 1) * limit,
	});

	console.log(transactions)

	const totalTransactions = await prisma.transaction.count({
		where: filters, // Aplica os mesmos filtros para contagem
	});


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
	const getSummaryQuerySchema = z.object({
		title: z.string().optional(),
		type: z.enum(['credit', 'debit']).optional(),
		day:z.coerce.number().optional(), // Filtro por dia é opcional
		month: z.coerce.number().optional(), // Filtro por mês é opcional
		year: z.coerce.number().optional(), // Filtro por ano é opcional
		startDate: z.string().optional(), // Filtro por data inicial
		endDate: z.string().optional(), // Filtro por data final
	})

	const { title, type, day, month, year, startDate, endDate } = getSummaryQuerySchema.parse(request.query)

	// Criação dinâmica do filtro
	const filters: any = {};

	// Passando o ano atual caso ele não passar, para fazer consulta o ano todo
	const currentYear = new Date().getFullYear();
	if (!year && !startDate && !endDate) {
		filters.transactionDate = {
			gte: new Date(`${currentYear}-01-01T00:00:00.000Z`).toISOString(), // Primeiro dia do ano atual
			lt: new Date(`${currentYear + 1}-01-01T00:00:00.000Z`).toISOString(), // Primeiro dia do próximo ano
		};
	}

	if (startDate && endDate) {
		filters.transactionDate = {
			gte: new Date(`${startDate.split('T')[0]}T00:00:00.000Z`).toISOString(), // Início do dia
			lt: new Date(`${endDate.split('T')[0]}T23:59:59.999Z`).toISOString(),   // Fim do dia
		};
	} else if (month && year) {
		const nextMonth = month === 12 ? 1 : month + 1;
    	const nextYear = month === 12 ? year + 1 : year;

    	filters.transactionDate = {
        	gte: new Date(`${year}-${String(month).padStart(2, '0')}-${day || '01'}T00:00:00.000Z`).toISOString(),
        	lt: new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-${day ? String(day + 1).padStart(2, '0') : '01'}T23:59:59.999Z`).toISOString(),
    	};
	} else if (year) {
		// Filtro para o ano inteiro
		filters.transactionDate = {
			gte: new Date(`${year}-01-01T00:00:00.000Z`).toISOString(), // Primeiro dia do ano
			lt: new Date(`${year + 1}-01-01T00:00:00.000Z`).toISOString(), // Primeiro dia do próximo ano
		};
	}

	if (type) {
		filters.type = type;
	}

	if (title) {
		filters.title = { 
			contains: title,
		 };
	}

	// Busca a soma de todas as transações de crédito
	let aggregations = await prisma.transaction.aggregate({
		_sum: {
			amount: true,
		},
		where: {
			...filters,
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
			...filters,
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