export const openapiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Dealio API',
    version: '0.1.0',
    description:
      '견적서/품목/계약/사용자 관리 및 메일 발송 API. 인증은 세션 쿠키 기반(`/api/auth/login` 호출 시 자동 설정).',
  },
  servers: [{ url: '/dealio', description: '현재 호스트 (basePath 적용)' }],
  tags: [
    { name: 'Auth', description: '로그인 / 로그아웃 / 현재 사용자' },
    { name: 'Quotations', description: '견적서 관리' },
    { name: 'Products', description: '품목 관리' },
    { name: 'Customers', description: '고객 관리' },
    { name: 'Contracts', description: '계약 관리' },
    { name: 'Users', description: '사용자 관리 (관리자)' },
    { name: 'System', description: '헬스체크' },
  ],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'dealio_session',
        description: '`/api/auth/login` 응답으로 자동 설정되는 세션 쿠키',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: {} },
      },
      QuotationItemInput: {
        type: 'object',
        required: ['name', 'quantity', 'unitPrice'],
        properties: {
          name: { type: 'string', example: '디자인 작업' },
          description: { type: 'string', nullable: true },
          quantity: { type: 'integer', minimum: 1, example: 1 },
          unitPrice: { type: 'number', minimum: 0, example: 1000000 },
        },
      },
      QuotationInput: {
        type: 'object',
        required: ['customerName', 'items'],
        properties: {
          customerName: { type: 'string', example: '주식회사 테스트' },
          customerEmail: { type: 'string', format: 'email', nullable: true },
          customerPhone: { type: 'string', nullable: true },
          customerAddress: { type: 'string', nullable: true },
          issueDate: { type: 'string', format: 'date', example: '2025-01-15' },
          validUntil: { type: 'string', format: 'date', nullable: true },
          status: {
            type: 'string',
            enum: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
            default: 'DRAFT',
          },
          notes: { type: 'string', nullable: true },
          vatIncluded: { type: 'boolean', default: true, description: 'true: 단가에 VAT 포함, false: 합계에 10% 추가' },
          items: { type: 'array', items: { $ref: '#/components/schemas/QuotationItemInput' } },
        },
      },
      SendMailInput: {
        type: 'object',
        required: ['to'],
        properties: {
          to: { type: 'string', format: 'email', example: 'customer@example.com' },
          cc: { type: 'string', format: 'email', nullable: true },
          subject: { type: 'string', nullable: true, description: '비우면 기본 템플릿 사용' },
          body: { type: 'string', nullable: true, description: '비우면 견적서 자동 본문 사용' },
          markAsSent: { type: 'boolean', default: true, description: '발송 성공 시 DRAFT → SENT 전환' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'admin' },
          password: { type: 'string', example: 'password' },
        },
      },
      ProductInput: {
        type: 'object',
        required: ['code', 'name'],
        properties: {
          code: { type: 'string', example: 'P-001' },
          name: { type: 'string', example: 'UI/UX 디자인' },
          description: { type: 'string', nullable: true },
          category: { type: 'string', enum: ['DEVELOPMENT', 'DESIGN', 'MAINTENANCE', 'PRINTING'], default: 'DEVELOPMENT' },
          unit: { type: 'string', default: 'EA' },
          currency: { type: 'string', enum: ['KRW', 'USD'], default: 'KRW' },
          unitPrice: { type: 'number', default: 0 },
          isActive: { type: 'boolean', default: true },
        },
      },
      CustomerInput: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email', nullable: true },
          phone: { type: 'string', nullable: true },
          address: { type: 'string', nullable: true },
          memo: { type: 'string', nullable: true },
          isActive: { type: 'boolean', default: true },
        },
      },
      ContractInput: {
        type: 'object',
        properties: { name: { type: 'string' } },
        additionalProperties: true,
        description: '계약 모델 (필드 자세한 사항은 Prisma schema 참고)',
      },
      UserCreateInput: {
        type: 'object',
        required: ['username', 'name', 'password'],
        properties: {
          username: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email', nullable: true },
          password: { type: 'string', minLength: 8 },
          role: { type: 'string', enum: ['ADMIN', 'USER'], default: 'USER' },
          isActive: { type: 'boolean', default: true },
        },
      },
    },
  },
  security: [{ sessionCookie: [] }],
  paths: {
    '/api/health': {
      get: {
        tags: ['System'],
        summary: '헬스체크',
        security: [],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: '로그인 (세션 쿠키 발급)',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } } },
        },
        responses: {
          '200': { description: '로그인 성공, Set-Cookie 헤더로 세션 발급' },
          '401': { description: '잘못된 자격증명' },
        },
      },
    },
    '/api/auth/logout': {
      post: { tags: ['Auth'], summary: '로그아웃', responses: { '204': { description: 'OK' } } },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: '현재 로그인 사용자',
        responses: { '200': { description: 'OK' }, '401': { description: '미인증' } },
      },
    },
    '/api/quotations': {
      get: {
        tags: ['Quotations'],
        summary: '견적서 목록',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: '고객명/번호 검색' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'] } },
          { name: 'take', in: 'query', schema: { type: 'integer', default: 50, maximum: 200 } },
          { name: 'skip', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Quotations'],
        summary: '견적서 생성',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/QuotationInput' } } },
        },
        responses: { '201': { description: 'Created' }, '400': { description: 'Validation error' } },
      },
    },
    '/api/quotations/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: { tags: ['Quotations'], summary: '견적서 상세', responses: { '200': { description: 'OK' }, '404': { description: 'NOT_FOUND' } } },
      put: {
        tags: ['Quotations'],
        summary: '견적서 수정',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/QuotationInput' } } },
        },
        responses: { '200': { description: 'OK' } },
      },
      delete: { tags: ['Quotations'], summary: '견적서 삭제', responses: { '204': { description: 'OK' } } },
    },
    '/api/quotations/{id}/send': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      post: {
        tags: ['Quotations'],
        summary: '견적서 메일 발송',
        description:
          'SMTP 환경변수가 설정되어 있어야 함. 미설정 시 503 + SMTP_NOT_CONFIGURED. 발송 결과는 발송 이력(QuotationSendLog)에 기록됨.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SendMailInput' } } },
        },
        responses: {
          '200': { description: '발송 성공 (ok: true)' },
          '400': { description: 'Validation error' },
          '404': { description: '견적서 없음' },
          '502': { description: 'SMTP 발송 실패' },
          '503': { description: 'SMTP 미설정' },
        },
      },
    },
    '/api/quotations/{id}/history': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: { tags: ['Quotations'], summary: '견적서 변경 이력', responses: { '200': { description: 'OK' } } },
    },
    '/api/products': {
      get: {
        tags: ['Products'],
        summary: '품목 목록',
        parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Products'],
        summary: '품목 생성',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductInput' } } } },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/products/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: { tags: ['Products'], summary: '품목 상세', responses: { '200': { description: 'OK' } } },
      put: {
        tags: ['Products'],
        summary: '품목 수정',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductInput' } } } },
        responses: { '200': { description: 'OK' } },
      },
      delete: { tags: ['Products'], summary: '품목 삭제', responses: { '204': { description: 'OK' } } },
    },
    '/api/customers': {
      get: { tags: ['Customers'], summary: '고객 목록', responses: { '200': { description: 'OK' } } },
      post: {
        tags: ['Customers'],
        summary: '고객 생성',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CustomerInput' } } } },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/customers/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: { tags: ['Customers'], summary: '고객 상세', responses: { '200': { description: 'OK' } } },
      put: {
        tags: ['Customers'],
        summary: '고객 수정',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CustomerInput' } } } },
        responses: { '200': { description: 'OK' } },
      },
      delete: { tags: ['Customers'], summary: '고객 삭제', responses: { '204': { description: 'OK' } } },
    },
    '/api/contracts': {
      get: { tags: ['Contracts'], summary: '계약 목록', responses: { '200': { description: 'OK' } } },
      post: {
        tags: ['Contracts'],
        summary: '계약 생성',
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/ContractInput' } } } },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/contracts/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: { tags: ['Contracts'], summary: '계약 상세', responses: { '200': { description: 'OK' } } },
      put: {
        tags: ['Contracts'],
        summary: '계약 수정',
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/ContractInput' } } } },
        responses: { '200': { description: 'OK' } },
      },
      delete: { tags: ['Contracts'], summary: '계약 삭제', responses: { '204': { description: 'OK' } } },
    },
    '/api/users': {
      get: { tags: ['Users'], summary: '사용자 목록 (관리자)', responses: { '200': { description: 'OK' }, '403': { description: 'Forbidden' } } },
      post: {
        tags: ['Users'],
        summary: '사용자 생성 (관리자)',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UserCreateInput' } } } },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/users/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: { tags: ['Users'], summary: '사용자 상세 (관리자)', responses: { '200': { description: 'OK' } } },
      put: { tags: ['Users'], summary: '사용자 수정 (관리자)', responses: { '200': { description: 'OK' } } },
      delete: { tags: ['Users'], summary: '사용자 삭제 (관리자)', responses: { '204': { description: 'OK' } } },
    },
  },
} as const;
