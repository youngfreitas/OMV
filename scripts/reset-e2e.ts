/* Recria os dados do banco de TESTE E2E (omv_test) e o arquivo e2e/.estado.json. */
import globalSetup from '../e2e/global-setup';

globalSetup().then(() => console.log('Banco de testes e2e recriado.'));
