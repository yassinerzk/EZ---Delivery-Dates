export class Metafield {
  constructor(admin) {
    this.admin = admin;
  }

  async create({ namespace, key, value, ownerId, type }) {
    const inferredType = type || this._getValueType(value);
    const mutation = `#graphql
    mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          namespace
          key
          value
          type
        }
        userErrors {
          field
          message
        }
      }
    }`;

    const variables = {
      variables: {
        metafields: [{
          namespace,
          key,
          value: inferredType === 'json' ? JSON.stringify(value) : String(value),
          type: inferredType,
          ownerId,
        }],
      },
    };

    const response = await this.admin.graphql(mutation, variables);
    const {
      data: {
        metafieldsSet: { metafields, userErrors },
      },
    } = await response.json();

    if (userErrors.length > 0) {
      throw new Error(userErrors.map(error => error.message).join(', '));
    }

    return metafields[0];
  }

  async update({ id, namespace, key, value, ownerId, type }) {
    
    const inferredType = type || this._getValueType(value);
    const mutation = `#graphql
    mutation metafieldUpdate($input: MetafieldUpdateInput!) {
      metafieldUpdate(input: $input) {
        metafield {
          id
          namespace
          key
          value
          type
        }
        userErrors {
          field
          message
        }
      }
    }`;

    const variables = {
      variables: {
        input: {
          id,
          namespace,
          key,
          value: inferredType === 'json' ? JSON.stringify(value) : String(value),
          type: inferredType,
          ownerId,
        },
      },
    };

    const response = await this.admin.graphql(mutation, variables);
    const {
      data: {
        metafieldUpdate: { metafield, userErrors },
      },
    } = await response.json();

    if (userErrors.length > 0) {
      throw new Error(userErrors.map(error => error.message).join(', '));
    }

    return metafield;
  }

  async delete(id) {
    const mutation = `#graphql
    mutation metafieldDelete($input: MetafieldDeleteInput!) {
      metafieldDelete(input: $input) {
        deletedId
        userErrors {
          field
          message
        }
      }
    }`;

    const variables = {
      variables: {
        input: { id },
      },
    };
    const response = await this.admin.graphql(mutation, variables);

    const {
      data: {
        metafieldDelete: { deletedId, userErrors },
      },
    } = await response.json();

    if (userErrors.length > 0) {
      throw new Error(userErrors.map(error => error.message).join(', '));
    }

    return deletedId;
  }

  async getCurrentAppOwnerId() {
    const query = `#graphql
    query getOwnerID {
      currentAppInstallation {
        id
      }
    }`;
    
    const response = await this.admin.graphql(query);
    const { data } = await response.json();
    return data.currentAppInstallation.id;
  }

  async getMetafield(resource, id, namespace, key) {
    const query = `#graphql
    query getMetafield($id: ID!, $namespace: String!, $key: String!) {
      ${resource}(id: $id) {
        metafield(namespace: $namespace, key: $key) {
          id
          namespace
          key
          value
          type
        }
      }
    }`;

    const variables = {
      variables: { id, namespace, key },
    };

    const response = await this.admin.graphql(query, variables);
    const { data } = await response.json();
    return data[resource].metafield;
  }

  async getCurrentAppMetafield(namespace, key) {
    const query = `#graphql
    query currentAppInstallation($namespace: String!, $key: String!) {
      appInstallation {
        metafield(namespace: $namespace, key: $key) {
          id
          namespace
          key
          value
          type
        }
      }
    }`;

    const variables = {
      variables: { namespace, key },
    };

    const response = await this.admin.graphql(query, variables);
    const { data } = await response.json();
    return data.appInstallation.metafield;
  }

  getProductMetafield(id, namespace, key) {
    return this.getMetafield('product', id, namespace, key);
  }

  getProductVariantMetafield(id, namespace, key) {
    return this.getMetafield('productVariant', id, namespace, key);
  }

  getCustomerMetafield(id, namespace, key) {
    return this.getMetafield('customer', id, namespace, key);
  }

  getDiscountMetafield(id, namespace, key) {
    return this.getMetafield('discountNode', id, namespace, key);
  }

  _getValueType(value) {
    if (typeof value === 'string') return 'single_line_text_field';
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'integer' : 'number_decimal';
    }
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'json';
    if (typeof value === 'object') return 'json';
    return 'single_line_text_field'; // Default to single_line_text_field for other types
  }
}