import { Pagina } from '@/components/ds';
import { requirePermission } from '@/lib/auth/guards';
import { ImportarArquivo } from './ImportarArquivo';

export const metadata = { title: 'Importar arquivo' };

export default async function Importar() {
  await requirePermission('submissao:importar');
  return (
    <Pagina titulo="Importar arquivo" descricao="Envie um arquivo preenchido a partir de um dos modelos oficiais (.csv, .xlsx, .docx ou .md, até 5 MB). O arquivo vira um rascunho para sua conferência; nada é enviado automaticamente.">
      <ImportarArquivo />
    </Pagina>
  );
}
