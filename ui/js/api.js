const API_BASE_URL = 'http://localhost:3000';

/**
 * Função genérica para realizar chamadas fetch.
 * @param {string} endpoint - O endpoint da API a ser chamado.
 * @param {object} [options={}] - Opções para a requisição fetch.
 * @returns {Promise<any>} - Os dados da resposta em JSON.
 */
async function fetchData(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erro na requisição: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Falha ao interagir com o endpoint: ${endpoint}.`, error);
    throw error; // Re-lança o erro para ser tratado por quem chamou a função
  }
}

// 🔹 PRODUTOS
export const getProdutos = () => fetchData('/produtos');

// 🔹 CLIENTES
export const getClientes = () => fetchData('/clientes');

// 🔹 PEDIDOS
export const getPedidos = () => fetchData('/pedidos');

/**
 * Envia um novo pedido para a API.
 * @param {object} orderData - Os dados do pedido.
 * @param {number} orderData.cliente_id - O ID do cliente.
 * @param {Array<object>} orderData.itens - A lista de itens do pedido.
 * @returns {Promise<any>} - A resposta da API com o pedido criado.
 */
export const createPedido = (orderData) => fetchData('/pedidos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(orderData),
});

/**
 * Busca os detalhes resumidos de um pedido específico.
 * @param {number} pedidoId - O ID do pedido.
 * @returns {Promise<any>} - Os detalhes do pedido.
 */
export const getPedidoResumido = (pedidoId) => fetchData(`/consultas/pedido-resumido/${pedidoId}`);

/**
 * Busca os itens detalhados de um pedido específico.
 * @param {number} pedidoId - O ID do pedido.
 * @returns {Promise<any>} - A lista de itens detalhados.
 */
export const getPedidoDetalhe = (pedidoId) => fetchData(`/consultas/pedido-detalhe/${pedidoId}`);

/**
 * Atualiza o status de um pedido.
 * @param {number} pedidoId - O ID do pedido a ser atualizado.
 * @param {string} newStatus - O novo status do pedido.
 * @returns {Promise<any>} - A resposta da API com o pedido atualizado.
 */
export const updateOrderStatus = (pedidoId, newStatus) => fetchData(`/pedidos/${pedidoId}/status`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: newStatus }),
});