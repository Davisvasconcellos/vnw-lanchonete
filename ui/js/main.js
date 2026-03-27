import { getApiStatus, getProdutos, getClientes, getPedidos, createPedido, getPedidoResumido, getPedidoDetalhe, updateOrderStatus } from './api.js';
import { createProductCard, createOrderCard, createClientButton, createOrderDetailItem } from './components.js';

let allClientes = [];
let selectedClientId = null;
let cart = {}; // Objeto para armazenar os itens do carrinho (productId: quantity)
let countdownInterval;
let selectedOrderId = null; // Novo: Para armazenar o ID do pedido selecionado

/**
 * Renderiza uma lista de itens em um container HTML.
 * @param {string} containerId - ID do elemento container.
 * @param {Array<object>} items - Array de dados.
 * @param {function} createItemHtml - Função que cria o HTML para um item.
 * @param {string} [notFoundMessage] - Mensagem para exibir se a lista estiver vazia.
 */
function renderList(containerId, items, createItemHtml, notFoundMessage = 'Nenhum item encontrado.') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container com ID "${containerId}" não foi encontrado.`);
        return;
    }

    if (!items || items.length === 0) {
        container.innerHTML = `<p class="text-on-surface-variant p-4">${notFoundMessage}</p>`;
        return;
    }

    container.innerHTML = items.map((item, index) => createItemHtml(item, index)).join('');
}

function renderClientes() {
  // Marca o cliente selecionado como ativo
  renderList('client-list', allClientes, (cliente) => createClientButton(cliente, cliente.id === selectedClientId), 'Nenhum cliente cadastrado.');
}

/**
 * Exibe uma notificação temporária na tela.
 * @param {string} message - A mensagem a ser exibida.
 * @param {boolean} [isError=false] - Se a notificação é de erro.
 */
function showNotification(message, isError = false) {
  const toast = document.getElementById('notification-toast');
  const messageEl = document.getElementById('notification-message');

  if (!toast || !messageEl) return;

  messageEl.textContent = message;
  toast.classList.toggle('bg-error-container', isError);
  toast.classList.toggle('text-on-error-container', isError);
  toast.classList.toggle('bg-tertiary', !isError);
  toast.classList.toggle('text-on-tertiary', !isError);

  toast.classList.remove('translate-x-[calc(100%+2rem)]'); // Mostra
  setTimeout(() => {
    toast.classList.add('translate-x-[calc(100%+2rem)]'); // Esconde
  }, 3000); // A notificação some após 3 segundos
}

// =========================
// CARREGAMENTO DOS DADOS
// =========================
async function carregarProdutos() {
  const produtosDaApi = await getProdutos();
  console.log('Produtos carregados:', produtosDaApi);
  // Passa a quantidade do carrinho para a função de criação do card
  renderList('product-list', produtosDaApi, (produto) => createProductCard(produto, cart[produto.id] || 0), 'Nenhum produto disponível.');
}

async function carregarClientes() {
  const clientesDaApi = await getClientes();
  console.log('Clientes carregados da API:', clientesDaApi);

  // Cria o cliente fixo "BALCÃO"
  const clienteBalcao = {
    id: 0, // Usamos um ID especial para ele
    nome: 'Cliente BALCÃO',
    endereco: 'Retirada no local'
  };

  // Combina o cliente balcão com os clientes da API e armazena
  allClientes = [clienteBalcao, ...clientesDaApi];

  // Define o primeiro cliente (BALCÃO) como selecionado inicialmente
  if (allClientes.length > 0) {
    selectedClientId = allClientes[0].id;
  }

  renderClientes();
}

async function carregarPedidos() {
  const pedidos = await getPedidos();
  console.log('Lista de pedidos carregada:', pedidos);

  // Se nenhum pedido estiver selecionado, seleciona o primeiro por padrão
  if (pedidos.length > 0 && selectedOrderId === null) {
    selectedOrderId = pedidos[0].id;
    loadOrderDetails(selectedOrderId); // Carrega detalhes do primeiro pedido na carga inicial
  }

  renderList('order-list', pedidos, createOrderCard, 'Nenhum pedido encontrado.');
}

async function handleFecharPedido() {
  console.log('Tentando fechar o pedido...');

  // 1. Formata os itens do carrinho para o formato que a API espera
  const itens = Object.entries(cart)
    .filter(([, quantidade]) => quantidade > 0)
    .map(([produto_id, quantidade]) => ({
      produto_id: parseInt(produto_id, 10),
      quantidade,
    }));

  if (itens.length === 0) {
    alert('Seu carrinho está vazio!');
    return;
  }

  // 2. Monta o objeto do pedido
  const pedidoData = {
    cliente_id: selectedClientId,
    itens: itens,
    observacao: 'Pedido via simulador' // Pode ser um campo de input no futuro
  };

  try {
    const novoPedido = await createPedido(pedidoData);
    showNotification(`Pedido #${novoPedido.id} criado com sucesso!`);
    
    // 3. Limpa o carrinho e atualiza a interface
    cart = {};
    await carregarProdutos(); // Re-renderiza produtos com contadores zerados
    await carregarPedidos(); // Atualiza a lista de pedidos

    // 4. Reseta o cliente para o padrão (BALCÃO)
    if (allClientes.length > 0) {
      selectedClientId = allClientes[0].id; // ID 0 = Cliente BALCÃO
      renderClientes();
    }
  } catch (error) {
    showNotification(`Erro ao criar pedido: ${error.message}`, true);
  }
}

/** 
 * Carrega e exibe os detalhes de um pedido no painel de detalhes.
 * @param {number} pedidoId - O ID do pedido a ser carregado.
 */
async function loadOrderDetails(pedidoId) {
  const detailClientNameEl = document.getElementById('detail-client-name');
  const detailClientAddressEl = document.getElementById('detail-client-address');
  const detailItemsListEl = document.getElementById('detail-items-list');
  const detailTotalEl = document.getElementById('detail-total');
  const detailStatusBadgeEl = document.getElementById('detail-status-badge');
  const actionButton = document.getElementById('detail-action-button');

  // Limpa detalhes anteriores
  detailClientNameEl.textContent = 'N/A';
  detailClientAddressEl.innerHTML = 'N/A';
  detailItemsListEl.innerHTML = '<p class="text-on-surface-variant">Carregando itens...</p>';
  detailTotalEl.textContent = 'R$ 0,00';
  if (detailStatusBadgeEl) {
    detailStatusBadgeEl.className = 'text-[10px] px-2 py-0.5 rounded-md font-bold bg-surface-container-highest text-on-surface-variant'; // Reset classes
    detailStatusBadgeEl.textContent = 'N/A';
  }
  actionButton.disabled = true;
  actionButton.classList.add('opacity-50', 'cursor-not-allowed');
  actionButton.classList.remove('bg-blue-500', 'text-white', 'bg-green-500', 'bg-tertiary-fixed', 'text-on-tertiary-fixed');
  document.getElementById('detail-action-text').textContent = 'Carregando...';
  document.getElementById('detail-action-icon').textContent = 'hourglass_empty';


  try {
    // Busca os dados dos dois endpoints em paralelo
    const [pedidoResumidoData, pedidoItensData] = await Promise.all([
      getPedidoResumido(pedidoId),
      getPedidoDetalhe(pedidoId)
    ]);

    if (pedidoResumidoData && pedidoResumidoData.length > 0) {
      const pedido = pedidoResumidoData[0];

      detailClientNameEl.textContent = pedido.cliente_nome || 'Cliente não identificado';
      detailClientAddressEl.innerHTML = pedido.endereco || 'Endereço não disponível';
      detailTotalEl.textContent = `R$ ${parseFloat(pedido.total).toFixed(2).replace('.', ',')}`;

      // Atualiza o badge de status
      const statusMap = {
        'pendente': { text: 'PENDENTE', classes: 'bg-orange-500 text-white' },
        'em_preparo': { text: 'EM PREPARO', classes: 'bg-blue-500 text-white' },
        'pronto': { text: 'PRONTO', classes: 'bg-green-500 text-white' },
        'entregue': { text: 'ENTREGUE', classes: 'bg-gray-500 text-white' },
        'cancelado': { text: 'CANCELADO', classes: 'bg-red-500 text-white' }
      };
      const currentStatus = statusMap[pedido.status.toLowerCase()] || { text: 'DESCONHECIDO', classes: 'bg-surface-container-highest text-on-surface-variant' };
      detailStatusBadgeEl.className = `text-[10px] px-2 py-0.5 rounded-md font-bold ${currentStatus.classes}`;
      detailStatusBadgeEl.textContent = currentStatus.text;

      // Atualiza o botão de ação
      const statusTransitions = {
        pendente:   { text: 'PREPARAR',   next: 'em_preparo', icon: 'outdoor_grill', enabled: true, classes: 'bg-blue-500 text-white' },
        em_preparo: { text: 'PRONTO',     next: 'pronto',     icon: 'check',         enabled: true, classes: 'bg-green-500 text-white' },
        pronto:     { text: 'ENTREGAR',   next: 'entregue',   icon: 'local_shipping',enabled: true, classes: 'bg-tertiary-fixed text-on-tertiary-fixed' },
        entregue:   { text: 'FINALIZADO', next: null,         icon: 'done_all',      enabled: false, classes: '' },
        cancelado:  { text: 'CANCELADO',  next: null,         icon: 'cancel',        enabled: false, classes: '' }
      };
      const action = statusTransitions[pedido.status.toLowerCase()] || { text: 'Indisponível', enabled: false, icon: 'hourglass_disabled', classes: '' };

      document.getElementById('detail-action-text').textContent = action.text;
      document.getElementById('detail-action-icon').textContent = action.icon;
      actionButton.disabled = !action.enabled;
      actionButton.dataset.nextStatus = action.next; // Guarda o próximo status no botão

      if (action.enabled) {
        actionButton.classList.remove('opacity-50', 'cursor-not-allowed');
        actionButton.className += ` ${action.classes}`; // Adiciona as classes de cor
      } else {
        actionButton.classList.add('opacity-50', 'cursor-not-allowed');
      }

    } else {
      throw new Error('Resumo do pedido não encontrado.');
    }

    if (pedidoItensData && pedidoItensData.length > 0) {
      // Renderiza a lista de itens detalhados
      detailItemsListEl.innerHTML = pedidoItensData.map(createOrderDetailItem).join('');
    } else {
      detailItemsListEl.innerHTML = '<p class="text-on-surface-variant">Nenhum item encontrado para este pedido.</p>';
    }

  } catch (error) {
    console.error('Erro ao carregar detalhes do pedido:', error);
    detailItemsListEl.innerHTML = `<p class="text-red-500">Erro ao carregar detalhes: ${error.message}</p>`;
  }
}

async function handleUpdateStatus() {
  const nextStatus = document.getElementById('detail-action-button').dataset.nextStatus;
  if (!selectedOrderId || !nextStatus) {
    console.error('Não há pedido selecionado ou próximo status definido.');
    return;
  }

  try {
    await updateOrderStatus(selectedOrderId, nextStatus);
    showNotification(`Pedido #${selectedOrderId} atualizado para "${nextStatus}"!`);
    loadOrderDetails(selectedOrderId); // Recarrega os detalhes
    carregarPedidos(); // Atualiza a lista de pedidos
  } catch (error) {
    showNotification(`Erro ao atualizar status: ${error.message}`, true);
  }
}

// =========================
// EVENTOS
// =========================
function setupEventListeners() {
  const clientListContainer = document.getElementById('client-list');
  if (clientListContainer) {
    clientListContainer.addEventListener('click', (event) => {
      const clientButton = event.target.closest('button');
      if (clientButton && clientButton.dataset.clientId) {
        const clientId = parseInt(clientButton.dataset.clientId, 10);
        selectedClientId = clientId;
        console.log(`Cliente selecionado: ID ${selectedClientId}`);
        renderClientes(); // Re-renderiza a lista para atualizar o estado visual
      }
    });
  }

  const productListContainer = document.getElementById('product-list');
  if (productListContainer) {
    productListContainer.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;

      const action = button.dataset.action;
      if (!action) return;

      const productCard = button.closest('[data-product-id]');
      const productId = parseInt(productCard.dataset.productId, 10);

      // Inicializa a quantidade se não existir
      cart[productId] = cart[productId] || 0;

      if (action === 'add') {
        cart[productId]++;
      } else if (action === 'remove') {
        if (cart[productId] > 0) {
          cart[productId]--;
        }
      }

      // Atualiza apenas o contador do produto clicado
      const quantitySpan = productCard.querySelector('.quantity');
      quantitySpan.textContent = cart[productId];

      console.log('Carrinho atualizado:', cart);
    });
  }

  // Novo: Listener de clique para a lista de pedidos
  const orderListContainer = document.getElementById('order-list');
  if (orderListContainer) {
    orderListContainer.addEventListener('click', (event) => {
      const orderCard = event.target.closest('[data-order-id]');
      if (orderCard && orderCard.dataset.orderId) {
        const orderId = parseInt(orderCard.dataset.orderId, 10);
        if (orderId !== selectedOrderId) {
          selectedOrderId = orderId;
          loadOrderDetails(selectedOrderId); // Busca os detalhes do novo pedido
          carregarPedidos(); // Apenas re-renderiza a lista para destacar o novo item
        }
      }
    });
  }

  const fecharPedidoButton = document.getElementById('fechar-pedido-btn');
  if (fecharPedidoButton) {
    fecharPedidoButton.addEventListener('click', handleFecharPedido);
  }

  const detailActionButton = document.getElementById('detail-action-button');
  if (detailActionButton) {
    detailActionButton.addEventListener('click', handleUpdateStatus);
  }
}

// =========================
// INICIALIZAÇÃO
// =========================

/**
 * Inicia a aplicação principal, carregando todos os dados e configurando os eventos.
 */
async function initializeApp() {
  await Promise.all([
    carregarProdutos(),
    carregarClientes(),
    carregarPedidos()
  ]);
  setupEventListeners();

  // Esconde o overlay e mostra o conteúdo principal
  const loadingOverlay = document.getElementById('api-loading-overlay');
  const mainContent = document.getElementById('main-content');
  loadingOverlay.classList.add('opacity-0', 'pointer-events-none');
  mainContent.classList.remove('hidden');
  setTimeout(() => mainContent.classList.remove('opacity-0'), 50); // Fade-in
}

/**
 * Inicia um contador regressivo na tela antes de tentar a reconexão.
 * @param {number} seconds - A duração do contador em segundos.
 */
function startRetryCountdown(seconds) {
  const countdownMessageEl = document.getElementById('countdown-message');
  let remaining = seconds;

  countdownMessageEl.classList.remove('hidden');

  const updateCountdown = () => {
    countdownMessageEl.textContent = `Tentando novamente em ${remaining}s...`;
    remaining--;
  };

  updateCountdown(); // Mostra imediatamente

  countdownInterval = setInterval(() => {
    if (remaining < 0) {
      clearInterval(countdownInterval);
      checkApiStatus();
    } else {
      updateCountdown();
    }
  }, 1000);
}

/**
 * Verifica o status da API repetidamente até que ela esteja online.
 */
async function checkApiStatus() {
  const loadingMessage = document.getElementById('loading-message');
  try {
    const status = await getApiStatus();
    if (status.status === 'online') {
      loadingMessage.textContent = 'Servidor online. Carregando aplicação...';
      initializeApp();
    } else {
      throw new Error('API retornou um status inesperado.');
    }
  } catch (error) {
    loadingMessage.textContent = 'Falha ao conectar ao servidor.';
    document.getElementById('loading-submessage').classList.add('hidden'); // Esconde a submensagem
    
    // Limpa qualquer contador anterior antes de iniciar um novo
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
    startRetryCountdown(10);
  }
}

document.addEventListener('DOMContentLoaded', checkApiStatus);