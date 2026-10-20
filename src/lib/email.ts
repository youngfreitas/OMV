import 'server-only';
import nodemailer from 'nodemailer';

/** Envio de e-mail transacional. Sem SMTP_URL (dev), imprime o conteúdo no log do servidor. */
export async function enviarEmail(para: string, assunto: string, texto: string): Promise<void> {
  const url = process.env.SMTP_URL;
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      console.error('SMTP_URL não configurado: e-mail não enviado.');
      return;
    }
    console.log(`\n[e-mail DEV] para=${para}\nassunto=${assunto}\n${texto}\n`);
    return;
  }
  const t = nodemailer.createTransport(url);
  await t.sendMail({ from: process.env.SMTP_REMETENTE, to: para, subject: assunto, text: texto });
}
