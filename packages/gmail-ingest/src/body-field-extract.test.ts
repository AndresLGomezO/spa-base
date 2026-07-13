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
});
