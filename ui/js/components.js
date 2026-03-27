/**
 * Cria o HTML para um único card de produto.
 * @param {object} produto - O objeto do produto.
 * @returns {string} - O HTML do card do produto.
 */
export function createProductCard(produto, quantidade = 0) {
  // Usa a imagem da API se existir, senão, usa um placeholder.
  const imageUrl = produto.imagem_url?.trim() || `https://via.placeholder.com/80x80.png?text=${produto.nome.charAt(0)}`;
  // Garante que o preço seja um número antes de formatar
  const precoNumerico = parseFloat(produto.preco) || 0;
  const precoFormatado = precoNumerico.toFixed(2).replace('.', ',');

  return `
    <div class="bg-surface-container-lowest p-3 rounded-xl flex gap-3 group" data-product-id="${produto.id}">
      <div class="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
        <img alt="${produto.nome}" class="w-full h-full object-cover" src="${imageUrl}">
      </div>
      <div class="flex-1 flex flex-col justify-between">
        <div>
          <h4 class="font-bold text-sm">${produto.nome}</h4>
          <p class="text-[10px] text-on-surface-variant line-clamp-2">${produto.descricao}</p>
        </div>
        <div class="flex justify-between items-center mt-2">
          <span class="text-primary font-bold text-sm">R$ ${precoFormatado}</span>
          <div class="flex items-center gap-2 bg-surface-container-low rounded-full px-2 py-1">
            <button class="w-5 h-5 flex items-center justify-center text-primary" data-action="remove"><span class="material-symbols-outlined text-sm">remove</span></button>
            <span class="text-xs font-bold quantity">${quantidade}</span>
            <button class="w-5 h-5 flex items-center justify-center text-primary" data-action="add"><span class="material-symbols-outlined text-sm">add</span></button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Cria o HTML para um único card de pedido.
 * @param {object} pedido - O objeto do pedido.
 * @returns {string} - O HTML do card do pedido.
 */
export function createOrderCard(pedido, isSelected = false) {
  const statusMap = {
    'pendente': { text: 'PENDENTE', classes: 'bg-orange-500 text-white' },
    'em_preparo': { text: 'EM PREPARO', classes: 'bg-blue-500 text-white' },
    'pronto': { text: 'PRONTO', classes: 'bg-green-500 text-white' },
    'entregue': { text: 'ENTREGUE', classes: 'bg-gray-500 text-white' }, // Cor neutra para entregue
    'cancelado': { text: 'CANCELADO', classes: 'bg-red-500 text-white' }
  };
  const currentStatus = statusMap[pedido.status.toLowerCase()] || { text: 'DESCONHECIDO', classes: 'bg-surface-container-highest text-on-surface-variant' };

  const selectedClasses = isSelected ? 'border-l-4 border-primary shadow-md ring-1 ring-primary/5' : '';
  const baseClasses = 'bg-surface-container-lowest/50 p-4 rounded-xl hover:bg-surface-container-lowest transition-colors cursor-pointer group';

  return `
    <div class="${baseClasses} ${selectedClasses}" data-order-id="${pedido.id}">
      <div class="flex justify-between items-start mb-2">
        <span class="font-headline font-bold text-lg text-on-surface/60 group-hover:text-on-surface transition-colors">PEDIDO #${pedido.id}</span>
        <span class="${currentStatus.classes} text-[10px] px-2 py-0.5 rounded-md font-bold">${currentStatus.text}</span>
      </div>
      <div class="text-sm font-medium text-on-surface-variant">${pedido.cliente || 'Cliente não identificado'}</div>
      <div class="text-xs text-on-surface-variant/70 mt-1 truncate">${pedido.itens || 'Sem itens no pedido'}</div>
    </div>
  `;
}

/**
 * Cria o HTML para um botão de cliente.
 * @param {object} cliente - O objeto do cliente.
 * @param {boolean} isActive - Se o cliente está ativo.
 * @returns {string} - O HTML do botão do cliente.
 */
export function createClientButton(cliente, isActive = false) {
  const activeClasses = "bg-tertiary text-on-tertiary shadow-lg";
  const inactiveClasses = "bg-surface-container-lowest text-on-surface hover:bg-tertiary hover:text-on-tertiary";

  return `
    <button class="flex-1 min-w-[200px] p-6 rounded-xl transition-all group ${isActive ? activeClasses : inactiveClasses}" data-client-id="${cliente.id}">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-full ${isActive ? 'bg-white/20' : 'bg-surface-container-low group-hover:bg-white/20'} flex items-center justify-center"><span class="material-symbols-outlined">person</span></div>
        <div class="text-left"><span class="block font-headline text-lg font-bold">${cliente.nome}</span><span class="text-xs ${isActive ? 'opacity-80' : 'text-on-surface-variant group-hover:text-white/80'}">Cliente #${cliente.id}</span></div>
      </div>
    </button>
  `;
}

/**
 * Cria o HTML para um item na lista de detalhes do pedido.
 * @param {object} item - O objeto do item do pedido.
 * @returns {string} - O HTML do item.
 */
export function createOrderDetailItem(item) {
  const imageUrl = item.imagem_url?.trim() || `https://via.placeholder.com/80x80.png?text=${item.produto.charAt(0)}`;
  const subtotalFormatado = (parseFloat(item.subtotal) || 0).toFixed(2).replace('.', ',');

  return `
    <div class="bg-surface-container-low rounded-2xl p-4 flex gap-4 items-center">
      <div class="w-16 h-16 rounded-xl overflow-hidden shadow-inner flex-shrink-0">
        <img alt="${item.produto}" class="w-full h-full object-cover" src="${imageUrl}">
      </div>
      <div class="flex-1">
        <p class="font-bold">${item.produto}</p>
        <p class="text-xs text-on-surface-variant mt-1">
          ${item.quantidade} x R$ ${(parseFloat(item.preco_unitario) || 0).toFixed(2).replace('.', ',')}
        </p>
      </div>
      <p class="font-bold text-primary">R$ ${subtotalFormatado}</p>
    </div>
  `;
}