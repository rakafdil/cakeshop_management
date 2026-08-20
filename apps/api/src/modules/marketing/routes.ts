import { crud } from '../../lib/crud';
import { authenticate } from '../../middleware/auth';

// Marketing & konten: konten media sosial, template value proposition,
// dan portofolio produk.

export const contentRoutes = crud('content', authenticate);

export const valuePropositionRoutes = crud('value-propositions', authenticate);

export const portfolioRoutes = crud('portfolio', authenticate);