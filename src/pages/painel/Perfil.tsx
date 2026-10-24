import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Store } from 'lucide-react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { Campo } from '@/components/ui/Campo'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/auth/AuthContext'
import { useUI } from '@/ui/UIProvider'
import { storage } from '@/lib/firebase'
import { rotuloPapel } from '@/types'
import { useRede } from '@/data/hooks'
import { FormAbrirLoja } from '@/pages/painel/Rede'

export function Perfil() {
  const { sessao, atualizarPerfil } = useAuth()
  const { adicionarToast } = useUI()
  const usuario = sessao!.usuario
  const restaurante = sessao!.restaurante

  const [nome, setNome] = useState(usuario.nome)
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const rede = useRede().data
  const [abrindoLoja, setAbrindoLoja] = useState(false)
  const arquivoRef = useRef<HTMLInputElement>(null)

  const nomeMudou = nome.trim() !== usuario.nome && nome.trim().length > 0

  async function salvarNome() {
    if (!nomeMudou) return
    setSalvandoNome(true)
    try {
      await atualizarPerfil({ nome: nome.trim() })
      adicionarToast({ tipo: 'sucesso', titulo: 'Nome atualizado', texto: 'Seu nome foi salvo.' })
    } catch {
      adicionarToast({ tipo: 'sistema', titulo: 'Não deu pra salvar', texto: 'Tenta de novo em instantes.' })
    } finally {
      setSalvandoNome(false)
    }
  }

  async function trocarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    if (!arquivo.type.startsWith('image/')) {
      adicionarToast({ tipo: 'sistema', titulo: 'Arquivo inválido', texto: 'Escolha uma imagem (JPG, PNG…).' })
      return
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      adicionarToast({ tipo: 'sistema', titulo: 'Imagem grande demais', texto: 'Escolha uma foto de até 5MB.' })
      return
    }
    setEnviandoFoto(true)
    try {
      const caminho = ref(storage, `avatars/${usuario.id}/foto`)
      await uploadBytes(caminho, arquivo, { contentType: arquivo.type })
      const url = await getDownloadURL(caminho)
      await atualizarPerfil({ photoURL: `${url}&t=${Date.now()}` })
      adicionarToast({ tipo: 'sucesso', titulo: 'Foto atualizada', texto: 'Sua nova foto já está valendo.' })
    } catch {
      adicionarToast({ tipo: 'sistema', titulo: 'Não deu pra enviar a foto', texto: 'Tenta de novo em instantes.' })
    } finally {
      setEnviandoFoto(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader titulo="Perfil" subtitulo="Seus dados e o restaurante conectado" lancar={false} semMes />

      <Cartao className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar inicial={usuario.avatarInicial} cor={usuario.avatarCor} foto={usuario.photoURL} tamanho={72} />
            <button
              onClick={() => arquivoRef.current?.click()}
              disabled={enviandoFoto}
              className="absolute -bottom-1 -right-1 rounded-full border-2 border-superficie bg-mar px-2 py-1 text-[10px] font-bold text-creme shadow-sm hover:bg-mar-escuro disabled:opacity-60"
            >
              {enviandoFoto ? '...' : 'Trocar'}
            </button>
            <input ref={arquivoRef} type="file" accept="image/*" className="hidden" onChange={trocarFoto} />
          </div>
          <div>
            <p className="text-lg font-bold text-tinta">{usuario.nome}</p>
            <span className="mt-1 inline-block rounded-chip bg-preenchimento px-2.5 py-0.5 text-xs font-semibold text-tinta-2">
              {rotuloPapel(usuario.papel)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 tab:max-w-md">
          <Campo
            rotulo="Seu nome"
            name="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            acessorio={
              nomeMudou ? (
                <button
                  onClick={salvarNome}
                  disabled={salvandoNome}
                  className="rotulo shrink-0 text-mar hover:underline disabled:opacity-60"
                >
                  {salvandoNome ? 'salvando…' : 'salvar'}
                </button>
              ) : undefined
            }
          />
          <Campo rotulo="E-mail" name="email" value={usuario.email} disabled readOnly />
        </div>
      </Cartao>

      <Cartao className="flex flex-col gap-1">
        <h2 className="text-[15px] font-bold text-tinta">Restaurante conectado</h2>
        <p className="text-sm text-tinta-2">
          {restaurante.nome}
          {restaurante.bairro ? ` · ${restaurante.bairro}` : ''}
        </p>
        <p className="mt-1 text-xs text-tinta-4">
          Toda conta no Tá no Caixa está sempre ligada a um restaurante — é por aqui que seus lançamentos e permissões valem.
        </p>
      </Cartao>
      <Cartao className="flex flex-col gap-3 !p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
          <div>
            <h2 className="text-[15px] font-bold text-tinta">{rede ? `Rede ${rede.nome}` : 'Mais de uma unidade?'}</h2>
            <p className="text-xs text-tinta-4">
              {rede
                ? `${rede.lojas.length} ${rede.lojas.length === 1 ? 'unidade' : 'unidades'} · cada uma com caixa, equipe e DRE próprios`
                : 'Abra outro restaurante ou franquia sem sair da sua conta.'}
            </p>
          </div>
          {rede ? (
            !abrindoLoja && (
              <button
                onClick={() => setAbrindoLoja(true)}
                className="flex items-center gap-1.5 rounded-botao bg-mar px-3.5 py-2 text-sm font-bold text-creme transition hover:bg-mar-escuro"
              >
                <Plus size={16} strokeWidth={2.5} />
                Adicionar restaurante ou franquia
              </button>
            )
          ) : (
            <Link
              to="/painel/rede"
              className="flex items-center gap-1.5 rounded-botao bg-mar px-3.5 py-2 text-sm font-bold text-creme transition hover:bg-mar-escuro"
            >
              <Plus size={16} strokeWidth={2.5} />
              Adicionar restaurante ou franquia
            </Link>
          )}
        </div>
        {rede && (
          <ul className="px-5 pb-1">
            {rede.lojas.map((l) => (
              <li key={l.restauranteId} className="flex items-center gap-2 border-t border-divisoria py-2.5 text-sm text-tinta-2 first:border-0">
                <Store size={15} className="shrink-0 text-tinta-4" />
                <span className="font-semibold text-tinta">{l.nome}</span>
                {l.bairro && <span className="text-tinta-4">· {l.bairro}</span>}
                {l.restauranteId === restaurante.id && (
                  <span className="rounded-chip bg-preenchimento px-2 py-0.5 text-xs font-semibold text-tinta-3">atual</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {rede && abrindoLoja && <FormAbrirLoja aoFechar={() => setAbrindoLoja(false)} />}
        {!rede && (
          <p className="px-5 pb-5 text-xs text-tinta-4">
            Você vai criar a rede (lojas suas ou franquia) e a loja atual entra como primeira unidade.
          </p>
        )}
        {rede && !abrindoLoja && <div className="pb-4" />}
      </Cartao>
    </div>
  )
}
