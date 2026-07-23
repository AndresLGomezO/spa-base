import { describe, expect, it } from "vitest";

import { extractBodyFields } from "./body-field-extract.js";

const SAMPLE_BODY = `DAVIVIENDA: Apreciado(a) ANDRES LEONARDO:

Le informamos que se ha registrado el siguiente movimiento de su Tarjeta Crédito terminada en ****7185:

Fecha: 2026/07/12
Hora: 11:23:51
Valor Transacción: 8,098
Clase de Movimiento: Compra .
Respuesta: Aprobado(a)
Lugar de Transacción: UBER RIDES*DL


Atentamente,

BANCO DAVIVIENDA S.A.
`;

const DAVIVIENDA_EXTRACTORS = [
  { field: "date", label: "Fecha", transform: "slashDate" as const },
  { field: "time", label: "Hora", transform: "trim" as const },
  { field: "amount", label: "Valor Transacción", transform: "amount" as const },
  {
    field: "type",
    label: "Clase de Movimiento",
    transform: "valueMap" as const,
    valueMap: {
      Compra: "EXPENSE",
      "Compra .": "EXPENSE",
      Abono: "PAYMENT",
      Pago: "PAYMENT",
      Comisión: "FEE",
    },
  },
  {
    field: "description",
    label: "Lugar de Transacción",
    transform: "trim" as const,
  },
];

describe("extractBodyFields", () => {
  it("extracts Davivienda structured body fields", () => {
    const result = extractBodyFields(SAMPLE_BODY, DAVIVIENDA_EXTRACTORS);
    expect(result.relevant).toBe(true);
    expect(result.fields).toEqual({
      date: "2026-07-12T11:23:51",
      time: "11:23:51",
      amount: 8098,
      type: "EXPENSE",
      description: "UBER RIDES*DL",
      isReversal: false,
      extractSource: "manual",
    });
  });

  it("coerces isReversal literal strings to booleans", () => {
    const result = extractBodyFields(
      "Fecha: 2026/07/12\nValor Transacción: 1,000\nLugar de Transacción: TEST",
      [
        { field: "amount", label: "Valor Transacción", transform: "amount" },
        {
          field: "isReversal",
          label: "",
          transform: "literal",
          literal: "true",
        },
      ],
    );
    expect(result.relevant).toBe(true);
    expect(result.fields.isReversal).toBe(true);
  });

  it("keeps date-only when time is missing", () => {
    const result = extractBodyFields(
      "Fecha: 2026/07/12\nValor Transacción: 1,000\nLugar de Transacción: TEST",
      DAVIVIENDA_EXTRACTORS,
    );
    expect(result.relevant).toBe(true);
    expect(result.fields.date).toBe("2026-07-12");
    expect(result.fields.time).toBeUndefined();
  });

  it("marks irrelevant when amount is missing", () => {
    const result = extractBodyFields(
      "Fecha: 2026/07/12\nLugar de Transacción: UBER",
      DAVIVIENDA_EXTRACTORS,
    );
    expect(result.relevant).toBe(false);
    expect(result.fields.amount).toBeUndefined();
    expect(result.fields.isReversal).toBe(false);
    expect(result.fields.extractSource).toBe("manual");
  });

  it("extracts PSE Consolidar payment fields", () => {
    const body = `¡Hola, Andrés Leonardo Gómez Ortiz!

 Los siguientes son los datos de tu transacción:

Valor: $ 1.000.000,00
Empresa: Fondo de Inversion Colectiva Consolidar
Descripción: CONSOLIDAR
Fecha de la transacción: 12/07/2026
CUS: 474253961
Gracias por utilizar nuestro servicio.
`;
    const result = extractBodyFields(body, [
      { field: "amount", label: "Valor", transform: "amount" },
      { field: "description", label: "Descripción", transform: "trim" },
      {
        field: "date",
        label: "Fecha de la transacción",
        transform: "slashDate",
      },
      { field: "cus", label: "CUS", transform: "trim" },
      { field: "type", transform: "literal", literal: "PAYMENT", label: "" },
    ]);
    expect(result.relevant).toBe(true);
    expect(result.fields).toEqual({
      amount: 1000000,
      description: "CONSOLIDAR · CUS 474253961",
      date: "2026-07-12",
      cus: "474253961",
      type: "PAYMENT",
      isReversal: false,
      extractSource: "manual",
    });
  });

  it("extracts PSE Altavista payment fields from Empresa + CUS", () => {
    const body = `¡Hola, Andrés Leonardo Gómez Ortiz!

 Los siguientes son los datos de tu transacción:

Valor: $ 566.300,00
Empresa: Banco Caja Social S.A. (Comercio)
Descripción: Pago ALTAVISTA TORRES DE APARTAMENTOS 22103
Fecha de la transacción: 09/07/2026
CUS: 467132360
`;
    const result = extractBodyFields(body, [
      { field: "amount", label: "Valor", transform: "amount" },
      { field: "description", label: "Empresa", transform: "trim" },
      {
        field: "date",
        label: "Fecha de la transacción",
        transform: "slashDate",
      },
      { field: "cus", label: "CUS", transform: "trim" },
      { field: "type", transform: "literal", literal: "PAYMENT", label: "" },
    ]);
    expect(result.relevant).toBe(true);
    expect(result.fields).toEqual({
      amount: 566300,
      description: "Banco Caja Social S.A. (Comercio) · CUS 467132360",
      date: "2026-07-09",
      cus: "467132360",
      type: "PAYMENT",
      isReversal: false,
      extractSource: "manual",
    });
  });

  it("extracts PSE Planilla payment fields with colon in Descripción", () => {
    const body = `¡Hola, Andrés Leonardo Gómez Ortiz!

 Los siguientes son los datos de tu transacción:

Valor: $ 726.300,00
Empresa: APORTES EN LINEA
Descripción: Pago de la Planilla de aportes con clave: 9506677809
Fecha de la transacción: 09/07/2026
CUS: 467121110
`;
    const result = extractBodyFields(body, [
      { field: "amount", label: "Valor", transform: "amount" },
      { field: "description", label: "Descripción", transform: "trim" },
      {
        field: "date",
        label: "Fecha de la transacción",
        transform: "slashDate",
      },
      { field: "cus", label: "CUS", transform: "trim" },
      { field: "type", transform: "literal", literal: "PAYMENT", label: "" },
    ]);
    expect(result.relevant).toBe(true);
    expect(result.fields).toEqual({
      amount: 726300,
      description:
        "Pago de la Planilla de aportes con clave: 9506677809 · CUS 467121110",
      date: "2026-07-09",
      cus: "467121110",
      type: "PAYMENT",
      isReversal: false,
      extractSource: "manual",
    });
  });

  it("extracts PSE Crediservice fields when label and value are on separate lines", () => {
    const body = `¡Hola, Andrés Leonardo Gómez Ortiz!

 Los siguientes son los datos de tu transacción:

 Valor: 
 $ 692.500,00 

 Empresa: 
 Banco de Bogota 

 Descripción: 
 PAGO BANCO DE BOGOTÁ - CREDISERVICE 

 Fecha de la transacción: 
 15/07/2026 

 CUS: 
 483564422 
`;
    const result = extractBodyFields(body, [
      { field: "amount", label: "Valor", transform: "amount" },
      { field: "description", label: "Descripción", transform: "trim" },
      {
        field: "date",
        label: "Fecha de la transacción",
        transform: "slashDate",
      },
      { field: "cus", label: "CUS", transform: "trim" },
      { field: "type", transform: "literal", literal: "PAYMENT", label: "" },
    ]);
    expect(result.relevant).toBe(true);
    expect(result.fields.amount).toBe(692500);
    expect(result.fields.date).toBe("2026-07-15");
    expect(result.fields.cus).toBe("483564422");
    expect(result.fields.description).toBe(
      "PAGO BANCO DE BOGOTÁ - CREDISERVICE · CUS 483564422",
    );
  });

  it("extracts PSE Mastercard Black payment fields", () => {
    const body = `¡Hola, Andrés Leonardo Gómez Ortiz!

 Los siguientes son los datos de tu transacción:

Valor: $ 716.000,00
Empresa: Banco de Bogota
Descripción: PAGO BANCO DE BOGOTÁ - TARJETA DE CRÉDITO MASTERCARD
Fecha de la transacción: 09/07/2026
CUS: 466182232
Gracias por utilizar nuestro servicio.
`;
    const result = extractBodyFields(body, [
      { field: "amount", label: "Valor", transform: "amount" },
      { field: "description", label: "Descripción", transform: "trim" },
      {
        field: "date",
        label: "Fecha de la transacción",
        transform: "slashDate",
      },
      { field: "cus", label: "CUS", transform: "trim" },
      { field: "type", transform: "literal", literal: "PAYMENT", label: "" },
    ]);
    expect(result.relevant).toBe(true);
    expect(result.fields).toEqual({
      amount: 716000,
      description:
        "PAGO BANCO DE BOGOTÁ - TARJETA DE CRÉDITO MASTERCARD · CUS 466182232",
      date: "2026-07-09",
      cus: "466182232",
      type: "PAYMENT",
      isReversal: false,
      extractSource: "manual",
    });
  });

  const BANCOLOMBIA_BODY = `
yellow-icon

¡Listo!
Todo salió bien con tus movimientos


Bancolombia: ANDRES, recibiste una transferencia de VICTOR MAURICIO REYES TRIANA por $1,750,000.00 en tu cuenta *2518 conectada a la llave andreslgomezo@gmail.com el 11/07/26 a las 17:09. Con llaves es de una y gratis. Dudas al 018000912345.
`;

  const BANCOLOMBIA_EXTRACTORS = [
    {
      field: "amount",
      label: "",
      pattern: "/por\\s+\\$([\\d.,]+)/i",
      transform: "amount" as const,
    },
    {
      field: "description",
      label: "",
      pattern: "/(transferencia de[\\s\\S]+?conectada a la llave \\S+)/i",
      transform: "trim" as const,
    },
    {
      field: "date",
      label: "",
      pattern: "/el\\s+(\\d{2}\\/\\d{2}\\/\\d{2}\\s+a las\\s+\\d{2}:\\d{2})/i",
      transform: "slashDate" as const,
    },
    {
      field: "type",
      transform: "literal" as const,
      literal: "INCOME",
      label: "",
    },
  ];

  it("extracts Bancolombia prose transfer fields via pattern capture", () => {
    const result = extractBodyFields(BANCOLOMBIA_BODY, BANCOLOMBIA_EXTRACTORS);
    expect(result.relevant).toBe(true);
    expect(result.fields).toEqual({
      amount: 1750000,
      description:
        "transferencia de VICTOR MAURICIO REYES TRIANA por $1,750,000.00 en tu cuenta *2518 conectada a la llave andreslgomezo@gmail.com",
      date: "2026-07-11T17:09:00",
      type: "INCOME",
      isReversal: false,
      extractSource: "manual",
    });
  });

  it("marks Bancolombia prose irrelevant when amount pattern misses", () => {
    const result = extractBodyFields(
      "Bancolombia: ANDRES, recibiste una transferencia de VICTOR MAURICIO REYES TRIANA sin monto el 11/07/26 a las 17:09.",
      BANCOLOMBIA_EXTRACTORS,
    );
    expect(result.relevant).toBe(false);
    expect(result.fields.amount).toBeUndefined();
    expect(result.fields.type).toBe("INCOME");
    expect(result.fields.extractSource).toBe("manual");
  });

  const BANCOLOMBIA_RENTAL_BODY = `
¡Listo!
Todo salió bien con tus movimientos


Bancolombia: Recibiste una transferencia por $3,206,391 de MARIA PARRA en tu cuenta **2518, el 15/06/2026 a las 12:39. Si tienes dudas, hablemos: 018000931987. Siempre a tu lado.
`;

  const BANCOLOMBIA_RENTAL_EXTRACTORS = [
    {
      field: "amount",
      label: "",
      pattern: "/por\\s+\\$([\\d.,]+)/i",
      transform: "amount" as const,
    },
    {
      field: "description",
      label: "",
      pattern:
        "/(transferencia por\\s+\\$[\\d.,]+\\s+de[\\s\\S]+?en tu cuenta\\s+\\*{1,2}\\d+)/i",
      transform: "trim" as const,
    },
    {
      field: "date",
      label: "",
      pattern:
        "/el\\s+(\\d{2}\\/\\d{2}\\/\\d{2,4}\\s+a las\\s+\\d{2}:\\d{2})/i",
      transform: "slashDate" as const,
    },
    {
      field: "type",
      transform: "literal" as const,
      literal: "INCOME",
      label: "",
    },
  ];

  it("extracts Bancolombia rental transfer fields via pattern capture", () => {
    const result = extractBodyFields(
      BANCOLOMBIA_RENTAL_BODY,
      BANCOLOMBIA_RENTAL_EXTRACTORS,
    );
    expect(result.relevant).toBe(true);
    expect(result.fields).toEqual({
      amount: 3206391,
      description:
        "transferencia por $3,206,391 de MARIA PARRA en tu cuenta **2518",
      date: "2026-06-15T12:39:00",
      type: "INCOME",
      isReversal: false,
      extractSource: "manual",
    });
  });

  it("parses compact datetime without 'a las' (el DD/MM/YYYY HH:mm:ss)", () => {
    const body =
      "Bancolombia: Pagaste $2454589.00 a Banco Davivienda SA Zona Pa desde tu producto 2518 el 04/07/2026 23:10:40. ¿Dudas? Llamanos al 6045109095. Estamos cerca ¿";
    const extractors = [
      {
        field: "amount",
        label: "",
        pattern: "/\\$\\s?([\\d.,]+)/",
        transform: "amount" as const,
      },
      {
        field: "date",
        label: "",
        pattern:
          "/(\\d{2}\\/\\d{2}\\/\\d{2,4}(?:\\s+a\\s+las\\s+|\\s+)\\d{2}:\\d{2}(?::\\d{2})?)/i",
        transform: "slashDate" as const,
      },
      {
        field: "description",
        label: "",
        pattern:
          "/Bancolombia:\\s*(.+?\\s+el\\s+\\d{2}\\/\\d{2}\\/\\d{2,4}(?:\\s+a\\s+las\\s+|\\s+)\\d{2}:\\d{2}(?::\\d{2})?)\\.?/is",
        transform: "trim" as const,
      },
      {
        field: "type",
        label: "",
        pattern: "/(?:^(?![\\s\\S]*QR)[\\s\\S]*?\\b(pagaste)\\b|\\b(recibiste)\\b)/i",
        transform: "valueMap" as const,
        valueMap: { pagaste: "PAYMENT", recibiste: "INCOME" },
      },
    ];
    const result = extractBodyFields(body, extractors);
    expect(result.relevant).toBe(true);
    expect(result.fields).toEqual({
      amount: 2454589,
      date: "2026-07-04T23:10:40",
      description:
        "Pagaste $2454589.00 a Banco Davivienda SA Zona Pa desde tu producto 2518 el 04/07/2026 23:10:40",
      type: "PAYMENT",
      isReversal: false,
      extractSource: "manual",
    });
  });
});

describe("Davivienda credit card statement extract", () => {
  const SUBJECT = "Extracto tarjeta de Crédito Banco Davivienda 20260628";
  const BODY = `¡Hola ANDRES LEONARDO GOMEZ ORTIZ!

Adjunto encontrará el extracto de su Tarjeta de Crédito Visa, terminada en 7185, correspondiente al mes de junio.

Pago mínimo
$3,763,248

Fecha límite de pago
15/Jul/2026
`;

  const EXTRACTORS = [
    {
      field: "emailKind",
      transform: "literal" as const,
      literal: "creditCardStatement",
      label: "",
      sufficientForRelevance: true,
    },
    {
      field: "statementDate",
      label: "",
      pattern: "/Extracto tarjeta de Cr[eé]dito Banco Davivienda\\s+(\\d{8})/i",
      transform: "compactYmd" as const,
    },
    {
      field: "amount",
      label: "",
      pattern: "/Pago m[ií]nimo\\s*\\n?\\s*\\$([\\d.,]+)/i",
      transform: "amount" as const,
    },
    {
      field: "nextDueDate",
      label: "",
      pattern:
        "/Fecha l[ií]mite de pago\\s*\\n?\\s*(\\d{1,2}\\/[A-Za-z]{3}\\/\\d{4})/i",
      transform: "monthNameDate" as const,
    },
  ];

  it("extracts statement fields from subject+body text", () => {
    const result = extractBodyFields(`${SUBJECT}\n${BODY}`, EXTRACTORS);
    expect(result.relevant).toBe(true);
    expect(result.fields.emailKind).toBe("creditCardStatement");
    expect(result.fields.statementDate).toBe("2026-06-28");
    expect(result.fields.amount).toBe(3763248);
    expect(result.fields.nextDueDate).toBe("2026-07-15");
  });

  it("stays relevant for creditCardStatement when amount cannot be parsed", () => {
    const result = extractBodyFields(SUBJECT, EXTRACTORS);
    expect(result.relevant).toBe(true);
    expect(result.fields.emailKind).toBe("creditCardStatement");
    expect(result.fields.statementDate).toBe("2026-06-28");
    expect(result.fields.amount).toBeUndefined();
  });
});

describe("extractBodyFields Banco de Bogotá Visa statement", () => {
  const SUBJECT = "Extracto Tarjeta de Crédito 15 Abril 2026";
  const BODY = `
Zona Segura: ANDRES L GOMEZ O

Nº de identificación terminado en: 0933

Tarjeta de Crédito

Hola, ANDRES L GOMEZ O

A continuación encontrarás el extracto de tu Tarjeta de Crédito.

En este correo encontrarás un archivo adjunto.Al ingresar tu número de identificación, podrás consultar la información correspondiente a tu tarjeta de crédito terminada en 3075, correspondiente al mes de Abril.
`;

  const EXTRACTORS = [
    {
      field: "emailKind",
      transform: "literal" as const,
      literal: "creditCardStatement",
      label: "",
      sufficientForRelevance: true,
    },
    {
      field: "statementDate",
      label: "",
      pattern:
        "/Extracto Tarjeta de Cr[eé]dito\\s+(\\d{1,2}\\s+[A-Za-záéíóúÁÉÍÓÚñÑ]+\\s+\\d{4})/i",
      transform: "monthNameDate" as const,
    },
  ];

  it("extracts statementDate from Spanish subject date and stays relevant without amount", () => {
    const result = extractBodyFields(`${SUBJECT}\n${BODY}`, EXTRACTORS);
    expect(result.relevant).toBe(true);
    expect(result.fields.emailKind).toBe("creditCardStatement");
    expect(result.fields.statementDate).toBe("2026-04-15");
    expect(result.fields.amount).toBeUndefined();
  });
});

describe("extractBodyFields Banco de Bogotá loan/mortgage statement", () => {
  const SUBJECT = "Extracto Crédito 04 Abril 2026 00958100400";
  const BODY = `
Hola ANDRES LEONARDO GOMEZ ORTIZ

En este tiempo de coyuntura queremos mantenerlo más informado sobre sus productos; por tal razón, adjunto encontrará el extracto de su Crédito.
`;

  const EXTRACTORS = [
    {
      field: "emailKind",
      transform: "literal" as const,
      literal: "creditCardStatement",
      label: "",
      sufficientForRelevance: true,
    },
    {
      field: "statementDate",
      label: "",
      pattern:
        "/Extracto Cr[eé]dito\\s+(\\d{1,2}\\s+[A-Za-záéíóúÁÉÍÓÚñÑ]+\\s+\\d{4})/i",
      transform: "monthNameDate" as const,
    },
    {
      field: "description",
      label: "",
      pattern:
        "/Extracto Cr[eé]dito\\s+\\d{1,2}\\s+[A-Za-záéíóúÁÉÍÓÚñÑ]+\\s+\\d{4}\\s+(.+)$/im",
      transform: "trim" as const,
    },
  ];

  it("extracts statementDate and credit number description from subject", () => {
    const result = extractBodyFields(`${SUBJECT}\n${BODY}`, EXTRACTORS);
    expect(result.relevant).toBe(true);
    expect(result.fields.emailKind).toBe("creditCardStatement");
    expect(result.fields.statementDate).toBe("2026-04-04");
    expect(result.fields.description).toBe("00958100400");
    expect(result.fields.amount).toBeUndefined();
  });
});

describe("extractBodyFields Banco Caja Social Pago exitoso", () => {
  const BODY = `Resumen de su transacción
	
Su transacción fue aprobada
Número de transacción APIE2607090052813613

Medio de pago

	
Banco:	BANCOLOMBIA
CUS:	467132360
Dirección IP:	152.201.74.140
Estado:	Aprobada
Resumen de pago

Fecha y hora:	9 de julio de 2026-15:17hrs.
Número de transacción:	APIE2607090052813613
Nombre del servicio:	ALTAVISTA TORRES DE APARTAMENTOS
NIT de la empresa:	9003175996
Dirección:	CL 32 13 52
Ciudad:	BOGOTA
Numero de Torre y Apartamento:	22103
Celular:	3008386182
Correo electrónico:	andreslgomezo@gmail.com
Valor:	$ $566.300,00
Descripción del pago:	Torre 2 AP 2103
`;

  const EXTRACTORS = [
    {
      field: "date",
      label: "Fecha y hora",
      transform: "monthNameDate" as const,
    },
    { field: "amount", label: "Valor", transform: "amount" as const },
    {
      field: "description",
      label: "",
      pattern:
        "/(N[uú]mero de transacci[oó]n:[\\s\\S]*?Descripci[oó]n del pago:\\s*[^\\n]+)/i",
      transform: "collapseWhitespace" as const,
    },
    {
      field: "type",
      transform: "literal" as const,
      literal: "PAYMENT",
      label: "",
    },
  ];

  it("extracts Spanish long datetime, amount, and collapsed description", () => {
    const result = extractBodyFields(BODY, EXTRACTORS);
    expect(result.relevant).toBe(true);
    expect(result.fields.date).toBe("2026-07-09T15:17:00");
    expect(result.fields.amount).toBe(566300);
    expect(result.fields.type).toBe("PAYMENT");
    expect(result.fields.description).toBe(
      "Número de transacción: APIE2607090052813613 Nombre del servicio: ALTAVISTA TORRES DE APARTAMENTOS NIT de la empresa: 9003175996 Dirección: CL 32 13 52 Ciudad: BOGOTA Numero de Torre y Apartamento: 22103 Celular: 3008386182 Correo electrónico: andreslgomezo@gmail.com Valor: $ $566.300,00 Descripción del pago: Torre 2 AP 2103",
    );
  });

  it("decodes HTML named entities before extracting description", () => {
    const encodedBody = `Fecha y hora:	9 de julio de 2026-15:17hrs.
N&uacute;mero de transacci&oacute;n:	APIE2607090052813613
Nombre del servicio:	ALTAVISTA TORRES DE APARTAMENTOS
NIT de la empresa:	9003175996
Direcci&oacute;n:	CL 32 13 52
Ciudad:	BOGOTA
Numero de Torre y Apartamento:	22103
Celular:	3008386182
Correo electr&oacute;nico:	andreslgomezo@gmail.com
Valor:	$ $566.300,00
Descripci&oacute;n del pago:	Torre 2 AP 2103
`;
    const result = extractBodyFields(encodedBody, EXTRACTORS);
    expect(result.relevant).toBe(true);
    expect(result.fields.date).toBe("2026-07-09T15:17:00");
    expect(result.fields.amount).toBe(566300);
    expect(String(result.fields.description)).toContain(
      "ALTAVISTA TORRES DE APARTAMENTOS",
    );
    expect(String(result.fields.description)).toContain(
      "Descripción del pago: Torre 2 AP 2103",
    );
  });
});
