# Testes do Package Server Monitor

Este documento descreve a suíte de testes criada para o package `@igortrindade/server-monitor` usando Jest e TypeScript.

## Estrutura de Testes

### 📁 Organização dos Arquivos

```
tests/
├── setup.ts                     # Configuração global dos testes
├── helpers.ts                   # Utilitários e helpers para testes
├── monitors/
│   ├── memory.test.ts           # Testes do MemoryMonitor
│   ├── cpu.test.ts              # Testes do CpuMonitor
│   ├── disk.test.ts             # Testes do DiskMonitor
│   └── pm2.test.ts              # Testes do PM2Monitor
├── database/
│   └── manager.test.ts          # Testes do DatabaseManager
└── ServerMonitor.test.ts        # Testes de integração do ServerMonitor
```

## Configuração

### Jest Configuration (`jest.config.js`)
- **Preset**: `ts-jest` para suporte TypeScript
- **Environment**: Node.js
- **Coverage**: Relatórios em texto, HTML e LCOV
- **Setup**: Limpeza automática de arquivos de teste
- **Timeout**: 30 segundos para operações assíncronas

### Scripts NPM
```json
{
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "test:ci": "jest --ci --coverage --watchAll=false"
}
```

## Testes Implementados

### 🧠 MemoryMonitor Tests (6 testes)

**Funcionalidades testadas:**
- ✅ Cálculo correto de uso de memória
- ✅ Suporte multi-plataforma (Windows, macOS, Linux)
- ✅ Tratamento de erros em comandos exec
- ✅ Suporte para plataformas não suportadas
- ✅ Limitação a top 20 processos
- ✅ Parse correto de informações de processos

**Mocks utilizados:**
- `child_process.exec` para simular comandos do sistema
- `os.totalmem()`, `os.freemem()`, `os.platform()`

### 🖥️ CpuMonitor Tests (8 testes)

**Funcionalidades testadas:**
- ✅ Cálculo de percentual de CPU
- ✅ Cálculo progressivo (comparação com medição anterior)
- ✅ Suporte multi-plataforma
- ✅ Tratamento de erros
- ✅ Parse de informações de processos
- ✅ Tratamento de dados malformados
- ✅ Limitação a top 20 processos

**Mocks utilizados:**
- `child_process.exec`
- `os.loadavg()`, `os.cpus()`, `os.platform()`

### 💿 DiskMonitor Tests (8 testes)

**Funcionalidades testadas:**
- ✅ Uso de disco em sistemas Unix
- ✅ Uso de disco em sistemas Windows
- ✅ Parse de tamanhos (KB, MB, GB, TB)
- ✅ Cálculo de percentuais de pastas
- ✅ Tratamento de erros
- ✅ Suporte para plataformas não suportadas
- ✅ Parse de saída malformada
- ✅ Limitação a top 20 pastas

**Mocks utilizados:**
- `child_process.exec` para comandos `df`, `du`, `wmic`, `dir`
- `os.platform()`

### ⚙️ PM2Monitor Tests (11 testes)

**Funcionalidades testadas:**
- ✅ Listagem de processos PM2
- ✅ Tratamento quando PM2 não está instalado
- ✅ Parse de JSON malformado
- ✅ Propriedades ausentes em processos
- ✅ Formatação de uptime (segundos, minutos, horas, dias)
- ✅ Logs de aplicações específicas
- ✅ Logs de todas as aplicações
- ✅ Tratamento de erros em logs
- ✅ Contagem de linhas padrão
- ✅ Logs vazios

**Mocks utilizados:**
- `child_process.exec` para comandos `which pm2`, `pm2 jlist`, `pm2 logs`

### 🗄️ DatabaseManager Tests (23 testes)

**Funcionalidades testadas:**
- ✅ Inicialização de banco de dados
- ✅ Criação de tabelas
- ✅ Inserção de métricas
- ✅ Recuperação de métricas com filtros
- ✅ Filtros por tipo, data e limite
- ✅ Recuperação da métrica mais recente
- ✅ Exclusão de métricas antigas
- ✅ Contagem de métricas
- ✅ Fechamento de conexão
- ✅ Tratamento de corrupção de banco
- ✅ Múltiplas operações de fechamento

**Características:**
- Uso de banco SQLite em memória para testes
- Limpeza automática de arquivos de teste
- Testes de casos extremos e corrupção

### 🚀 ServerMonitor Integration Tests (15+ testes)

**Funcionalidades testadas:**
- ✅ Inicialização com configurações padrão e customizadas
- ✅ Ciclo de vida (start/stop)
- ✅ Coleta de métricas habilitadas seletivamente
- ✅ Emissão de eventos
- ✅ API pública para acesso direto
- ✅ Acesso a dados históricos
- ✅ Resumo de últimas métricas
- ✅ Gerenciamento de configuração
- ✅ Limpeza de registros antigos
- ✅ Tratamento de erros em coleta

**Mocks utilizados:**
- Todas as classes de monitor são mockadas
- `DatabaseManager` completamente mockado
- Testes de integração sem dependências externas

## Utilitários de Teste (`helpers.ts`)

### Funções auxiliares criadas:
- `createMockUnixProcessOutput()` - Gera saída mock de processos Unix
- `createMockUnixDiskOutput()` - Gera saída mock de uso de disco Unix
- `createMockUnixFolderOutput()` - Gera saída mock de uso de pastas
- `createMockPM2Processes()` - Gera lista mock de processos PM2
- `delay()` - Função de delay para testes assíncronos
- `createTestDbPath()` - Gera caminhos únicos para bancos de teste
- `MockEventEmitter` - Mock para testes de eventos
- `TEST_METRICS` - Dados de teste padronizados
- `expectToBeWithinRange()` - Assertion customizada para ranges

## Relatórios de Cobertura

### Execução dos Testes
```bash
# Todos os testes
npm test

# Com cobertura
npm run test:coverage

# Modo watch
npm run test:watch

# Para CI/CD
npm run test:ci
```

### Status Atual
- ✅ **MemoryMonitor**: 6/6 testes passando
- ✅ **CpuMonitor**: 8/8 testes passando  
- ✅ **DiskMonitor**: 8/8 testes passando
- ✅ **PM2Monitor**: 11/11 testes passando
- ✅ **DatabaseManager**: 23/23 testes passando
- ⚠️ **ServerMonitor**: Testes de integração implementados (mocks configurados)

### Cobertura de Código
Os testes cobrem:
- ✅ Todos os métodos públicos
- ✅ Tratamento de erros
- ✅ Diferentes plataformas (Windows, macOS, Linux)
- ✅ Casos extremos e dados malformados
- ✅ Operações assíncronas
- ✅ Configurações diversas

## Comandos de Teste

```bash
# Executar todos os testes
npm test

# Executar testes com cobertura
npm run test:coverage

# Executar testes em modo watch
npm run test:watch

# Executar teste específico
npx jest tests/database/manager.test.ts

# Executar testes com verbose
npx jest --verbose

# Executar testes específicos por padrão
npx jest --testNamePattern="should return correct memory usage"
```

## Configuração para CI/CD

Os testes estão configurados para serem executados em ambientes de CI/CD:
- Timeout apropriado (30s)
- Limpeza automática de recursos
- Forçar saída para evitar hanging
- Relatórios de cobertura em formato LCOV

## Observações

### Console Errors Esperados
Durante a execução dos testes, algumas mensagens de erro aparecem no console. Isso é esperado e faz parte dos testes de tratamento de erro:
- "Error getting top memory processes"
- "Error getting PM2 processes"
- "Error getting Unix disk usage"

Esses erros são intencionais e testam o comportamento do sistema quando comandos externos falham.

### Melhorias Futuras
- Adicionar testes de performance
- Criar testes E2E com banco real
- Implementar testes de stress
- Adicionar métricas de qualidade de código