import { cache } from "react";
import { auth } from "@/lib/auth";

// auth() com sessão em banco faz uma consulta a cada chamada. O layout e o header
// chamavam os dois, então a mesma página consultava a sessão duas vezes.
// cache() do React deduplica dentro de uma mesma requisição.
export const getSession = cache(() => auth());
