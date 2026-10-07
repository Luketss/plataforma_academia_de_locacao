import { DocumentDuplicateIcon, TagIcon, UsersIcon, HomeModernIcon } from "@heroicons/react/24/outline";

// Itens do menu admin; cada um aparece só para quem tem algum verbo na área.
export const ADMIN_ITENS = [
  { to: "/admin/modelos", label: "Modelos", area: "modelos", icon: DocumentDuplicateIcon },
  { to: "/admin/categorias", label: "Categorias", area: "categorias", icon: TagIcon },
  { to: "/admin/usuarios", label: "Usuários", area: "usuarios", icon: UsersIcon },
  { to: "/admin/pagina-inicial", label: "Página inicial", area: "conteudo", icon: HomeModernIcon },
];
