const languageQuery = /* GraphQL */ `
  query GetLanguageCodes {
    __type(name: "LanguageCode") {
      enumValues {
        name
      }
    }
  }
`;

export default languageQuery;
