# Desafio Final - Módulo de Backend - VNW Lanchonete

Este projeto é a solução para o desafio final do módulo de Backend, que consiste em desenvolver um sistema de gestão de pedidos para uma lanchonete, utilizando Node.js, Express e PostgreSQL. A aplicação inclui um backend completo e uma interface de simulação para interação e documentação.

## Contexto do Caso

Uma pequena lanchonete localizada em um bairro movimentado começou a ganhar popularidade entre os moradores da região. O negócio surgiu de forma simples, atendendo principalmente clientes que consumiam no local ou realizavam pedidos para retirada. Com o passar do tempo, a qualidade dos produtos e o bom atendimento fizeram com que o estabelecimento conquistasse novos clientes e passasse a receber um volume maior de pedidos.

Apesar do crescimento representar uma oportunidade para o negócio, ele também trouxe desafios. Atualmente, todos os pedidos são registrados manualmente em um caderno, e diante do aumento da demanda o empreendimento busca resolver este problema. O método de registro manual funciona quando o número de pedidos é pequeno, porém com o aumento da demanda tornou-se difícil manter a ordem. O principal problema enfrentado é a falta de organização e centralização das informações, o que impacta diretamente o controle do negócio.

## Sobre a Solução Técnica (PostgreSQL)

Nesse contexto, espera-se que a solução seja elaborada utilizando o banco de dados PostgreSQL, garantindo compatibilidade com suas características e boas práticas. Além disso, a estrutura deve ser representada por meio de uma ferramenta de modelagem visual, que permite visualizar claramente como os diferentes elementos do sistema se conectam.

É importante destacar que não existe uma única forma correta de resolver o problema. Diferentes abordagens podem ser adotadas, desde que a solução seja coerente com o cenário apresentado e consiga atender às necessidades do negócio. As decisões tomadas durante a atividade devem fazer sentido dentro do contexto e devem ser justificadas.

### Formatos de Entrega Aceitos

A entrega deve incluir:

1.  **Arquivo de Comandos:** Um arquivo contendo os comandos utilizados na construção da solução, permitindo que a estrutura seja criada e testada. Esse material deve estar organizado de forma clara e conter exemplos que demonstrem como os dados são inseridos e utilizados. Também é esperado que a solução apresente consultas.
2.  **Representação Visual:** Uma representação visual da estrutura proposta, demonstrando como as informações estão organizadas e como se relacionam entre si.

---

## Visão Geral da Aplicação

Abaixo, uma captura de tela da interface principal do simulador e da documentação interativa.

![Screenshot do Simulador de Pedidos](./ui/assets/img/screenshot-simulador.png)

## Acesso ao Projeto

A aplicação está disponível para acesso e teste no seguinte link:

**[Acessar a Aplicação Online](https://vnw-lanchonete-ui.onrender.com/)**

## Tecnologias Utilizadas

*   **Backend:** Node.js, Express.js, PostgreSQL
*   **Frontend:** HTML5, Tailwind CSS, JavaScript (ES Modules)
*   **Ferramentas:** `node-postgres` (pg), `http-server`, `dotenv`

## Estrutura do Projeto

```
/
├── api/          # Contém o servidor backend em Node.js + Express
│   ├── .env      # (A ser criado) Variáveis de ambiente
│   └── server.js # Arquivo principal da API
├── ui/           # Contém a interface do usuário (frontend estático)
│   ├── assets/   # Arquivos de documentação (PDF, TXT)
│   ├── js/       # Scripts do frontend (api.js, components.js, main.js)
│   ├── *.html    # Páginas da aplicação
└── .gitignore    # Arquivos e pastas a serem ignorados pelo Git
```

## Instruções de Instalação e Execução

Para executar este projeto localmente, você precisará do **Node.js** e de um banco de dados **PostgreSQL** em execução.

### 1. Clone o Repositório

```bash
git clone <url-do-seu-repositorio>
cd vnw-lanchonete
```

### 2. Configure o Backend

Primeiro, instale as dependências da API.

```bash
cd api
npm install
```

Em seguida, crie um arquivo chamado `.env` dentro da pasta `api/` e adicione a sua string de conexão com o banco de dados.

**Arquivo: `api/.env`**
```
DATABASE_URL="postgresql://USUARIO:SENHA@HOST:PORTA/NOME_DO_BANCO"
```

### 3. Execute a Aplicação

Você precisará de **dois terminais** abertos na pasta raiz do projeto.

#### Terminal 1: Iniciar o Backend (API)

Neste terminal, vamos iniciar o servidor Node.js.

```bash
# Navegue até a pasta da API
cd api

# Inicie o servidor
node server.js
```

Você deverá ver a mensagem `🚀 API rodando em http://localhost:3000`.

#### Terminal 2: Iniciar o Frontend (UI)

Neste terminal, vamos usar o `http-server` para servir os arquivos estáticos da interface.

```bash
# Navegue até a pasta da UI
cd ui

# Execute o servidor estático (o -c-1 desabilita o cache)
npx http-server -c-1
```

Você verá uma mensagem indicando que o servidor está rodando, geralmente em `http://127.0.0.1:8080`.

### 4. Acesse a Aplicação

Abra seu navegador e acesse a URL fornecida pelo `http-server` (ex: `http://127.0.0.1:8080`). Você terá acesso a:

*   **Simular Ambiente (`index.html`):** A interface principal para simular a criação de pedidos.
*   **Links de Documentação:** No menu lateral, você encontrará links para as páginas de `Diagrama`, `Criar Database`, `Inserir Dados` e `Querys`, que contêm toda a documentação técnica e interativa do projeto.

## Considerações Finais

Este projeto foi desenvolvido com **fins educacionais**. O objetivo principal é demonstrar a construção de um backend robusto com Node.js e sua integração com um banco de dados PostgreSQL, além de uma interface de simulação funcional.

Por esse motivo, algumas funcionalidades foram intencionalmente omitidas para manter o foco no escopo do desafio:

*   **Não há operações de `DELETE`:** Para evitar a remoção acidental de dados durante a demonstração.
*   **Não há sistema de autenticação/autorização:** A API é pública e não requer login, simplificando os testes e a exploração das funcionalidades.

---