import { useRef, useState, type DragEvent } from 'react'
import { ImagePlus, Trash2, Upload } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/cn'
import { mensagemDeErro } from '@/lib/erros'
import { useAuth } from '@/auth/AuthContext'
import { useRestaurante, useTenant } from '@/data/hooks'
import { LOGO, enviarLogo, problemaDoArquivo, removerLogo } from '@/data/logo'
import { useUI } from '@/ui/UIProvider'
import { LogoDaLoja, useFormatoDaLogo } from '@/components/layout/LogoDaLoja'

/**
 * Envio da logo da loja aberta. Mostra como ela vai ficar no header e diz
 * o formato e o tamanho que encaixam sem distorcer. `compacto` é a versão do
 * onboarding (opcional, sem o cartão em volta).
 */
export function CampoLogo({ compacto, podeEditar = true }: { compacto?: boolean; podeEditar?: boolean }) {
  const { sessao } = useAuth()
  const tenant = useTenant()
  const cfg = useRestaurante().data
  const qc = useQueryClient()
  const { adicionarToast } = useUI()
  const entrada = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(false)
  const [arrastando, setArrastando] = useState(false)

  const logo = cfg?.logoUrl
  const formato = useFormatoDaLogo(logo, cfg?.logoFormato)
  const { quadrado, horizontal } = LOGO.formatos
  const demo = sessao?.demo ?? false
  const editavel = podeEditar && !demo

  async function escolher(f: File | undefined) {
    if (!f) return
    const problema = problemaDoArquivo(f)
    if (problema) {
      adicionarToast({ tipo: 'sistema', titulo: 'Essa imagem não serve', texto: problema })
      return
    }
    setEnviando(true)
    try {
      await enviarLogo(tenant, f)
      await qc.invalidateQueries({ queryKey: [tenant, 'restaurante'] })
      adicionarToast({ tipo: 'sucesso', titulo: 'Logo salva', texto: 'Já aparece no topo das páginas da loja.' })
    } catch (e) {
      console.error('logo:', e)
      adicionarToast({ tipo: 'erro', titulo: 'Não deu pra enviar a logo', texto: mensagemDeErro(e, 'Tente de novo em instantes.') })
    } finally {
      setEnviando(false)
      if (entrada.current) entrada.current.value = ''
    }
  }

  async function remover() {
    setEnviando(true)
    try {
      await removerLogo(tenant)
      await qc.invalidateQueries({ queryKey: [tenant, 'restaurante'] })
      adicionarToast({ tipo: 'sucesso', titulo: 'Logo removida', texto: 'O topo das páginas volta a mostrar só o nome.' })
    } catch (e) {
      adicionarToast({ tipo: 'erro', titulo: 'Não deu pra remover', texto: mensagemDeErro(e, 'Tente de novo.') })
    } finally {
      setEnviando(false)
    }
  }

  function soltar(e: DragEvent) {
    e.preventDefault()
    setArrastando(false)
    if (editavel) escolher(e.dataTransfer.files?.[0])
  }

  return (
    <div className={cn('flex flex-col gap-3', !compacto && 'cel:flex-row cel:items-stretch cel:gap-4')}>
      <input
        ref={entrada}
        id="logo-da-loja"
        type="file"
        accept={LOGO.tipos.join(',')}
        className="hidden"
        onChange={(e) => escolher(e.target.files?.[0])}
      />

      {/* Área de envio: placeholder com o formato sugerido, ou a logo atual */}
      <button
        type="button"
        disabled={!editavel || enviando}
        onClick={() => entrada.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          if (editavel) setArrastando(true)
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={soltar}
        aria-label={logo ? 'Trocar a logo da loja' : 'Enviar a logo da loja'}
        className={cn(
          'group flex min-w-0 flex-1 flex-col items-center justify-center gap-2 rounded-cartao border-2 border-dashed p-4 text-center transition',
          arrastando ? 'border-mar bg-mar/5' : 'border-[rgba(46,95,115,0.22)] bg-preenchimento/40',
          editavel && 'hover:border-mar/60 hover:bg-mar/5',
          !editavel && 'cursor-default',
        )}
      >
        {logo ? (
          <span
            className={cn('relative block w-full overflow-hidden rounded-campo bg-superficie', formato === 'quadrado' ? 'max-w-[140px]' : 'max-w-[260px]')}
            style={{ aspectRatio: formato === 'quadrado' ? '1 / 1' : '5 / 2' }}
          >
            <img src={logo} alt="Logo da loja" className="absolute inset-3 h-[calc(100%-24px)] w-[calc(100%-24px)] object-contain" />
          </span>
        ) : (
          // Os dois formatos aceitos, lado a lado, com o tamanho de cada um.
          <span className="flex w-full items-end justify-center gap-3">
            <span
              className="grid w-[96px] shrink-0 place-items-center rounded-campo border border-[rgba(46,95,115,0.16)] bg-superficie text-tinta-4"
              style={{ aspectRatio: '1 / 1' }}
            >
              <span className="flex flex-col items-center gap-1">
                <ImagePlus size={20} />
                <span className="mono text-[10px]">
                  {quadrado.largura} × {quadrado.altura}
                </span>
              </span>
            </span>
            <span
              className="grid w-full max-w-[220px] place-items-center rounded-campo border border-[rgba(46,95,115,0.16)] bg-superficie text-tinta-4"
              style={{ aspectRatio: '5 / 2' }}
            >
              <span className="flex flex-col items-center gap-1">
                <ImagePlus size={20} />
                <span className="mono text-[10px]">
                  {horizontal.largura} × {horizontal.altura}
                </span>
              </span>
            </span>
          </span>
        )}
        <span className="text-sm font-bold text-tinta">
          {enviando ? 'Enviando…' : logo ? (editavel ? 'Trocar logo' : 'Logo da loja') : editavel ? 'Enviar logo' : 'Sem logo ainda'}
        </span>
        <span className="text-xs text-tinta-4">
          {LOGO.arquivo}, até 2 MB. {quadrado.nome}: {quadrado.largura} × {quadrado.altura} px ({quadrado.proporcao}) ou{' '}
          {horizontal.nome.toLowerCase()}: {horizontal.largura} × {horizontal.altura} px ({horizontal.proporcao}).
          {editavel && ' Clique ou arraste o arquivo aqui.'}
        </span>
      </button>

      {/* Como fica no header */}
      <div className={cn('flex flex-col gap-2', !compacto && 'cel:w-[300px] cel:shrink-0')}>
        <span className="rotulo text-tinta-4">Como fica no topo das páginas</span>
        <div className="relative flex items-center gap-3 overflow-hidden rounded-cartao bg-mar px-4 py-3.5">
          <span
            className="pointer-events-none absolute -bottom-10 -right-6 h-20 w-20 rounded-full"
            style={{ background: '#EFAB5C', opacity: 0.9 }}
            aria-hidden
          />
          <LogoDaLoja url={logo} formato={formato} reserva={!logo} />
          <span className="relative z-10 min-w-0">
            <span className="block truncate text-creme" style={{ fontSize: 17, fontWeight: 800 }}>
              Dashboard
            </span>
            <span className="block truncate text-xs text-creme/80">{cfg?.nome ?? 'Sua loja'}</span>
          </span>
        </div>
        <p className="text-xs text-tinta-4">
          O app reconhece o formato pela proporção da imagem e usa a caixa quadrada ou a horizontal. A logo encolhe pra caber, sem esticar nem cortar.
        </p>
        {logo && editavel && (
          <button
            type="button"
            onClick={remover}
            disabled={enviando}
            className="inline-flex items-center gap-1.5 self-start text-xs font-bold text-telha-alerta hover:underline disabled:opacity-50"
          >
            <Trash2 size={13} />
            Remover logo
          </button>
        )}
        {!logo && editavel && compacto && (
          <span className="inline-flex items-center gap-1.5 text-xs text-tinta-4">
            <Upload size={13} />
            Opcional: dá pra enviar depois em Ajustes.
          </span>
        )}
      </div>
    </div>
  )
}
