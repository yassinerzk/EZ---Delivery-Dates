import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  TextField,
  Select,
  Checkbox,
  FormLayout,
  Banner,
  Popover,
  OptionList,
  Combobox,
  Listbox,
  Avatar,
  InlineStack,
  Icon,
  Spinner
} from "@shopify/polaris";
import {
  SearchIcon,
  CheckIcon
} from '@shopify/polaris-icons';
import * as FlagIcons from 'country-flag-icons/react/3x2';
import { TitleBar, SaveBar } from "@shopify/app-bridge-react";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLoaderData, useFetcher } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import { saveDeliveryRule, attachRuleMetafieldToProduct } from "../lib/supabase.server.ts";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session?.shop;
  
  // Initial products load
  const response = await admin.graphql(
    `#graphql
      query getProducts($first: Int!, $query: String) {
        products(first: $first, query: $query) {
          edges {
            node {
              id
              title
              handle
              featuredImage {
                url
                altText
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }`,
    {
      variables: {
        first: 20,
        query: ""
      }
    }
  );
  
  const data = await response.json();
  return json({ products: data.data.products, shop });
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get('intent');
  
  // Handle saving delivery rule
  if (request.method === 'POST' && !intent) {
    const shop = session?.shop;
    const targetType = formData.get('targetType');
    const targetValue = formData.get('targetValue');
    const countryCodes = formData.get('countryCodes');
    const estimatedMinDays = formData.get('estimatedMinDays');
    const estimatedMaxDays = formData.get('estimatedMaxDays');
    const customMessage = formData.get('customMessage') || '';
    const enabled = formData.get('enabled') === 'true';
    const isDefault = formData.get('isDefault') === 'true';
    
    try {
      // Parse the data for database insertion
      const ruleData = {
        shop,
        target_type: targetType,
        target_value: targetValue,
        country_codes: countryCodes ? JSON.parse(countryCodes) : [],
        estimated_min_days: parseInt(estimatedMinDays, 10),
        estimated_max_days: parseInt(estimatedMaxDays, 10),
        custom_message: customMessage || null,
        enabled,
        is_default: isDefault
      };
      
      // Save to Supabase database
      const { data, error } = await saveDeliveryRule(ruleData);
      
      if (error) {
        console.error('Database error:', error);
        return json({ success: false, error: 'Failed to save delivery rule to database' }, { status: 500 });
      }

      // After successful rule save, create/update product metafield if target is a product
      if (data && targetType === 'product' && targetValue) {
        // Convert product ID to GraphQL format if needed
        const productId = targetValue.startsWith('gid://') ? targetValue : `gid://shopify/Product/${targetValue}`;
        
        const metafieldResult = await attachRuleMetafieldToProduct(productId, data.id, admin);
        
        if (!metafieldResult.success) {
          console.error('Failed to create/update product metafield:', metafieldResult.error);
          // Note: We don't fail the entire operation if metafield creation fails
          // The rule is still saved successfully
        } else {
          console.log('Product metafield created/updated successfully for rule:', data.id);
        }
      }
      
      console.log('Delivery rule saved successfully:', data);
      return json({ success: true, message: 'Delivery rule saved successfully!', data });
    } catch (error) {
      console.error('Error saving delivery rule:', error);
      return json({ success: false, error: 'Failed to save delivery rule' }, { status: 500 });
    }
  }
  
  if (intent === 'searchProducts') {
    const query = formData.get('query') || '';
    const cursor = formData.get('cursor');
    
    const response = await admin.graphql(
      `#graphql
        query getProducts($first: Int!, $query: String, $after: String) {
          products(first: $first, query: $query, after: $after) {
            edges {
              node {
                id
                title
                handle
                featuredImage {
                  url
                  altText
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }`,
      {
        variables: {
          first: 20,
          query: query,
          after: cursor
        }
      }
    );
    
    const data = await response.json();
    return json({ products: data.data.products });
  }
  
  return json({ success: false });
};

export default function NewDeliveryRule() {
  const navigate = useNavigate();
  const { products: initialProducts, shop } = useLoaderData();
  const fetcher = useFetcher();
  const actionData = fetcher.data;
  
  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const initialFormData = useRef(null);
  const pendingNavigation = useRef(null);
  
  // Define initial state with empty values
  const getInitialFormData = () => ({
    targetType: '',
    targetValue: '',
    selectedItems: [],
    countryCodes: '',
    estimatedMinDays: '',
    estimatedMaxDays: '',
    customMessage: '',
    enabled: false,
    isDefault: false,
  });

  const [formData, setFormData] = useState(getInitialFormData);
  
  // Initialize form data reference with the initial state
  useEffect(() => {
    if (!initialFormData.current) {
      const initial = getInitialFormData();
      initialFormData.current = { ...initial };
    }
  }, []);

  const [popoverActive, setPopoverActive] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState([]);
  
  // Product search state
  const [products, setProducts] = useState(initialProducts.edges.map(edge => edge.node));
  const [productQuery, setProductQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(initialProducts.pageInfo.hasNextPage);
  const [endCursor, setEndCursor] = useState(initialProducts.pageInfo.endCursor);
  
  // Country selection state - initialize with no selection
  const [countrySelection, setCountrySelection] = useState({
    type: 'specific', // 'all' | 'specific'
    countries: []
  });
  const [countryQuery, setCountryQuery] = useState('');
  
  // Countries data with codes and names
  const countries = [
    { code: 'AD', name: 'Andorra' },
    { code: 'AE', name: 'United Arab Emirates' },
    { code: 'AF', name: 'Afghanistan' },
    { code: 'AG', name: 'Antigua and Barbuda' },
    { code: 'AI', name: 'Anguilla' },
    { code: 'AL', name: 'Albania' },
    { code: 'AM', name: 'Armenia' },
    { code: 'AO', name: 'Angola' },
    { code: 'AQ', name: 'Antarctica' },
    { code: 'AR', name: 'Argentina' },
    { code: 'AS', name: 'American Samoa' },
    { code: 'AT', name: 'Austria' },
    { code: 'AU', name: 'Australia' },
    { code: 'AW', name: 'Aruba' },
    { code: 'AX', name: 'Åland Islands' },
    { code: 'AZ', name: 'Azerbaijan' },
    { code: 'BA', name: 'Bosnia and Herzegovina' },
    { code: 'BB', name: 'Barbados' },
    { code: 'BD', name: 'Bangladesh' },
    { code: 'BE', name: 'Belgium' },
    { code: 'BF', name: 'Burkina Faso' },
    { code: 'BG', name: 'Bulgaria' },
    { code: 'BH', name: 'Bahrain' },
    { code: 'BI', name: 'Burundi' },
    { code: 'BJ', name: 'Benin' },
    { code: 'BL', name: 'Saint Barthélemy' },
    { code: 'BM', name: 'Bermuda' },
    { code: 'BN', name: 'Brunei' },
    { code: 'BO', name: 'Bolivia' },
    { code: 'BQ', name: 'Caribbean Netherlands' },
    { code: 'BR', name: 'Brazil' },
    { code: 'BS', name: 'Bahamas' },
    { code: 'BT', name: 'Bhutan' },
    { code: 'BV', name: 'Bouvet Island' },
    { code: 'BW', name: 'Botswana' },
    { code: 'BY', name: 'Belarus' },
    { code: 'BZ', name: 'Belize' },
    { code: 'CA', name: 'Canada' },
    { code: 'CC', name: 'Cocos Islands' },
    { code: 'CD', name: 'Democratic Republic of the Congo' },
    { code: 'CF', name: 'Central African Republic' },
    { code: 'CG', name: 'Republic of the Congo' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'CI', name: 'Côte d\'Ivoire' },
    { code: 'CK', name: 'Cook Islands' },
    { code: 'CL', name: 'Chile' },
    { code: 'CM', name: 'Cameroon' },
    { code: 'CN', name: 'China' },
    { code: 'CO', name: 'Colombia' },
    { code: 'CR', name: 'Costa Rica' },
    { code: 'CU', name: 'Cuba' },
    { code: 'CV', name: 'Cape Verde' },
    { code: 'CW', name: 'Curaçao' },
    { code: 'CX', name: 'Christmas Island' },
    { code: 'CY', name: 'Cyprus' },
    { code: 'CZ', name: 'Czech Republic' },
    { code: 'DE', name: 'Germany' },
    { code: 'DJ', name: 'Djibouti' },
    { code: 'DK', name: 'Denmark' },
    { code: 'DM', name: 'Dominica' },
    { code: 'DO', name: 'Dominican Republic' },
    { code: 'DZ', name: 'Algeria' },
    { code: 'EC', name: 'Ecuador' },
    { code: 'EE', name: 'Estonia' },
    { code: 'EG', name: 'Egypt' },
    { code: 'EH', name: 'Western Sahara' },
    { code: 'ER', name: 'Eritrea' },
    { code: 'ES', name: 'Spain' },
    { code: 'ET', name: 'Ethiopia' },
    { code: 'FI', name: 'Finland' },
    { code: 'FJ', name: 'Fiji' },
    { code: 'FK', name: 'Falkland Islands' },
    { code: 'FM', name: 'Micronesia' },
    { code: 'FO', name: 'Faroe Islands' },
    { code: 'FR', name: 'France' },
    { code: 'GA', name: 'Gabon' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'GD', name: 'Grenada' },
    { code: 'GE', name: 'Georgia' },
    { code: 'GF', name: 'French Guiana' },
    { code: 'GG', name: 'Guernsey' },
    { code: 'GH', name: 'Ghana' },
    { code: 'GI', name: 'Gibraltar' },
    { code: 'GL', name: 'Greenland' },
    { code: 'GM', name: 'Gambia' },
    { code: 'GN', name: 'Guinea' },
    { code: 'GP', name: 'Guadeloupe' },
    { code: 'GQ', name: 'Equatorial Guinea' },
    { code: 'GR', name: 'Greece' },
    { code: 'GS', name: 'South Georgia' },
    { code: 'GT', name: 'Guatemala' },
    { code: 'GU', name: 'Guam' },
    { code: 'GW', name: 'Guinea-Bissau' },
    { code: 'GY', name: 'Guyana' },
    { code: 'HK', name: 'Hong Kong' },
    { code: 'HM', name: 'Heard Island' },
    { code: 'HN', name: 'Honduras' },
    { code: 'HR', name: 'Croatia' },
    { code: 'HT', name: 'Haiti' },
    { code: 'HU', name: 'Hungary' },
    { code: 'ID', name: 'Indonesia' },
    { code: 'IE', name: 'Ireland' },
    { code: 'IL', name: 'Israel' },
    { code: 'IM', name: 'Isle of Man' },
    { code: 'IN', name: 'India' },
    { code: 'IO', name: 'British Indian Ocean Territory' },
    { code: 'IQ', name: 'Iraq' },
    { code: 'IR', name: 'Iran' },
    { code: 'IS', name: 'Iceland' },
    { code: 'IT', name: 'Italy' },
    { code: 'JE', name: 'Jersey' },
    { code: 'JM', name: 'Jamaica' },
    { code: 'JO', name: 'Jordan' },
    { code: 'JP', name: 'Japan' },
    { code: 'KE', name: 'Kenya' },
    { code: 'KG', name: 'Kyrgyzstan' },
    { code: 'KH', name: 'Cambodia' },
    { code: 'KI', name: 'Kiribati' },
    { code: 'KM', name: 'Comoros' },
    { code: 'KN', name: 'Saint Kitts and Nevis' },
    { code: 'KP', name: 'North Korea' },
    { code: 'KR', name: 'South Korea' },
    { code: 'KW', name: 'Kuwait' },
    { code: 'KY', name: 'Cayman Islands' },
    { code: 'KZ', name: 'Kazakhstan' },
    { code: 'LA', name: 'Laos' },
    { code: 'LB', name: 'Lebanon' },
    { code: 'LC', name: 'Saint Lucia' },
    { code: 'LI', name: 'Liechtenstein' },
    { code: 'LK', name: 'Sri Lanka' },
    { code: 'LR', name: 'Liberia' },
    { code: 'LS', name: 'Lesotho' },
    { code: 'LT', name: 'Lithuania' },
    { code: 'LU', name: 'Luxembourg' },
    { code: 'LV', name: 'Latvia' },
    { code: 'LY', name: 'Libya' },
    { code: 'MA', name: 'Morocco' },
    { code: 'MC', name: 'Monaco' },
    { code: 'MD', name: 'Moldova' },
    { code: 'ME', name: 'Montenegro' },
    { code: 'MF', name: 'Saint Martin' },
    { code: 'MG', name: 'Madagascar' },
    { code: 'MH', name: 'Marshall Islands' },
    { code: 'MK', name: 'North Macedonia' },
    { code: 'ML', name: 'Mali' },
    { code: 'MM', name: 'Myanmar' },
    { code: 'MN', name: 'Mongolia' },
    { code: 'MO', name: 'Macao' },
    { code: 'MP', name: 'Northern Mariana Islands' },
    { code: 'MQ', name: 'Martinique' },
    { code: 'MR', name: 'Mauritania' },
    { code: 'MS', name: 'Montserrat' },
    { code: 'MT', name: 'Malta' },
    { code: 'MU', name: 'Mauritius' },
    { code: 'MV', name: 'Maldives' },
    { code: 'MW', name: 'Malawi' },
    { code: 'MX', name: 'Mexico' },
    { code: 'MY', name: 'Malaysia' },
    { code: 'MZ', name: 'Mozambique' },
    { code: 'NA', name: 'Namibia' },
    { code: 'NC', name: 'New Caledonia' },
    { code: 'NE', name: 'Niger' },
    { code: 'NF', name: 'Norfolk Island' },
    { code: 'NG', name: 'Nigeria' },
    { code: 'NI', name: 'Nicaragua' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'NO', name: 'Norway' },
    { code: 'NP', name: 'Nepal' },
    { code: 'NR', name: 'Nauru' },
    { code: 'NU', name: 'Niue' },
    { code: 'NZ', name: 'New Zealand' },
    { code: 'OM', name: 'Oman' },
    { code: 'PA', name: 'Panama' },
    { code: 'PE', name: 'Peru' },
    { code: 'PF', name: 'French Polynesia' },
    { code: 'PG', name: 'Papua New Guinea' },
    { code: 'PH', name: 'Philippines' },
    { code: 'PK', name: 'Pakistan' },
    { code: 'PL', name: 'Poland' },
    { code: 'PM', name: 'Saint Pierre and Miquelon' },
    { code: 'PN', name: 'Pitcairn Islands' },
    { code: 'PR', name: 'Puerto Rico' },
    { code: 'PS', name: 'Palestine' },
    { code: 'PT', name: 'Portugal' },
    { code: 'PW', name: 'Palau' },
    { code: 'PY', name: 'Paraguay' },
    { code: 'QA', name: 'Qatar' },
    { code: 'RE', name: 'Réunion' },
    { code: 'RO', name: 'Romania' },
    { code: 'RS', name: 'Serbia' },
    { code: 'RU', name: 'Russia' },
    { code: 'RW', name: 'Rwanda' },
    { code: 'SA', name: 'Saudi Arabia' },
    { code: 'SB', name: 'Solomon Islands' },
    { code: 'SC', name: 'Seychelles' },
    { code: 'SD', name: 'Sudan' },
    { code: 'SE', name: 'Sweden' },
    { code: 'SG', name: 'Singapore' },
    { code: 'SH', name: 'Saint Helena' },
    { code: 'SI', name: 'Slovenia' },
    { code: 'SJ', name: 'Svalbard and Jan Mayen' },
    { code: 'SK', name: 'Slovakia' },
    { code: 'SL', name: 'Sierra Leone' },
    { code: 'SM', name: 'San Marino' },
    { code: 'SN', name: 'Senegal' },
    { code: 'SO', name: 'Somalia' },
    { code: 'SR', name: 'Suriname' },
    { code: 'SS', name: 'South Sudan' },
    { code: 'ST', name: 'São Tomé and Príncipe' },
    { code: 'SV', name: 'El Salvador' },
    { code: 'SX', name: 'Sint Maarten' },
    { code: 'SY', name: 'Syria' },
    { code: 'SZ', name: 'Eswatini' },
    { code: 'TC', name: 'Turks and Caicos Islands' },
    { code: 'TD', name: 'Chad' },
    { code: 'TF', name: 'French Southern Territories' },
    { code: 'TG', name: 'Togo' },
    { code: 'TH', name: 'Thailand' },
    { code: 'TJ', name: 'Tajikistan' },
    { code: 'TK', name: 'Tokelau' },
    { code: 'TL', name: 'Timor-Leste' },
    { code: 'TM', name: 'Turkmenistan' },
    { code: 'TN', name: 'Tunisia' },
    { code: 'TO', name: 'Tonga' },
    { code: 'TR', name: 'Turkey' },
    { code: 'TT', name: 'Trinidad and Tobago' },
    { code: 'TV', name: 'Tuvalu' },
    { code: 'TW', name: 'Taiwan' },
    { code: 'TZ', name: 'Tanzania' },
    { code: 'UA', name: 'Ukraine' },
    { code: 'UG', name: 'Uganda' },
    { code: 'UM', name: 'U.S. Minor Outlying Islands' },
    { code: 'US', name: 'United States' },
    { code: 'UY', name: 'Uruguay' },
    { code: 'UZ', name: 'Uzbekistan' },
    { code: 'VA', name: 'Vatican City' },
    { code: 'VC', name: 'Saint Vincent and the Grenadines' },
    { code: 'VE', name: 'Venezuela' },
    { code: 'VG', name: 'British Virgin Islands' },
    { code: 'VI', name: 'U.S. Virgin Islands' },
    { code: 'VN', name: 'Vietnam' },
    { code: 'VU', name: 'Vanuatu' },
    { code: 'WF', name: 'Wallis and Futuna' },
    { code: 'WS', name: 'Samoa' },
    { code: 'YE', name: 'Yemen' },
    { code: 'YT', name: 'Mayotte' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'ZM', name: 'Zambia' },
    { code: 'ZW', name: 'Zimbabwe' }
  ];
  
  // Helper function to get flag component
  const getFlagComponent = (countryCode) => {
    const FlagComponent = FlagIcons[countryCode];
    return FlagComponent || null;
  };
  
  // Memoize filtered countries to avoid recalculating on every render
  const filteredCountries = useMemo(() => {
    if (!countryQuery.trim()) return countries;
    
    const query = countryQuery.toLowerCase();
    return countries.filter(country => 
      country.name.toLowerCase().includes(query) ||
      country.code.toLowerCase().includes(query)
    );
  }, [countryQuery]);
  
  // Helper functions for country selection
  const isCountrySelected = useCallback((countryCode) => {
    return countrySelection.type === 'all' || 
           countrySelection.countries.some(c => c.code === countryCode);
  }, [countrySelection]);

  const getSelectedCountriesCount = useCallback(() => {
    return countrySelection.type === 'all' ? countries.length : countrySelection.countries.length;
  }, [countrySelection]);

  const getSelectedCountriesForDisplay = useCallback(() => {
    return countrySelection.type === 'all' ? countries : countrySelection.countries;
  }, [countrySelection]);

  // Handle country selection
  const handleCountrySelect = useCallback((selectedCountryCodes) => {
    const selected = countries.filter(country => selectedCountryCodes.includes(country.code));
    setCountrySelection({
      type: 'specific',
      countries: selected
    });
    setCountryQuery('');
  }, [countries]);

  const handleSelectAllCountries = useCallback(() => {
    const allSelected = countrySelection.type === 'all' || 
                       (countrySelection.type === 'specific' && countrySelection.countries.length === filteredCountries.length);
    
    if (allSelected) {
      // Deselect all
      setCountrySelection({
        type: 'specific',
        countries: []
      });
    } else {
      // Select all - use flag for efficiency
      if (filteredCountries.length === countries.length) {
        setCountrySelection({ type: 'all', countries: [] });
      } else {
        setCountrySelection({
          type: 'specific',
          countries: filteredCountries
        });
      }
    }
  }, [countrySelection, filteredCountries, countries]);
  
  // Initialize selected countries from form data only once on mount
  useEffect(() => {
    if (formData.countryCodes && countrySelection.countries.length === 0 && countrySelection.type === 'specific') {
      if (formData.countryCodes === 'ALL') {
        setCountrySelection({
          type: 'all',
          countries: []
        });
      } else {
        const codes = formData.countryCodes.split(',').map(code => code.trim()).filter(Boolean);
        const selected = countries.filter(country => codes.includes(country.code));
        setCountrySelection({
          type: 'specific',
          countries: selected
        });
      }
    }
  }, []);
  
  // Handle product search
  const searchProducts = useCallback((query) => {
    setIsLoadingProducts(true);
    const formData = new FormData();
    formData.append('intent', 'searchProducts');
    formData.append('query', query);
    fetcher.submit(formData, { method: 'post' });
  }, [fetcher]);
  
  // Handle load more products
  const loadMoreProducts = useCallback(() => {
    if (hasNextPage && !isLoadingProducts) {
      setIsLoadingProducts(true);
      const formData = new FormData();
      formData.append('intent', 'searchProducts');
      formData.append('query', productQuery);
      formData.append('cursor', endCursor);
      fetcher.submit(formData, { method: 'post' });
    }
  }, [hasNextPage, isLoadingProducts, productQuery, endCursor, fetcher]);
  
  // Handle fetcher data
  useEffect(() => {
    if (fetcher.data?.products) {
      const newProducts = fetcher.data.products.edges.map(edge => edge.node);
      if (fetcher.formData?.get('cursor')) {
        // Load more - append products
        setProducts(prev => [...prev, ...newProducts]);
      } else {
        // New search - replace products
        setProducts(newProducts);
      }
      setHasNextPage(fetcher.data.products.pageInfo.hasNextPage);
      setEndCursor(fetcher.data.products.pageInfo.endCursor);
      setIsLoadingProducts(false);
    }
  }, [fetcher.data]);
  
  // Handle product selection
  const handleProductSelect = useCallback((productIds) => {
    const selectedProductsList = products.filter(p => productIds.includes(p.id));
    setSelectedProducts(selectedProductsList);
    const productIdValues = selectedProductsList.map(p => p.id.replace('gid://shopify/Product/', ''));
    setFormData(prev => ({
      ...prev,
      targetValue: productIdValues.join(', '),
      selectedItems: productIds
    }));
    // Clear search query when products are selected to show selected state
    setProductQuery('');
  }, [products]);

  const targetTypeOptions = [
    { label: 'Product Tag', value: 'tag' },
    { label: 'Product', value: 'product' },
    { label: 'SKU', value: 'sku' },
    { label: 'Collection', value: 'collection' },
    { label: 'Collection Tag', value: 'collection_tag' },
    { label: 'Variant', value: 'variant' },
  ];

  // Dynamic options based on selected target type
  const getOptionsForTargetType = (targetType) => {
    switch (targetType) {
      case 'tag':
        return [
          { value: 'electronics', label: 'Electronics' },
          { value: 'clothing', label: 'Clothing' },
          { value: 'books', label: 'Books' },
          { value: 'home-garden', label: 'Home & Garden' },
          { value: 'sports', label: 'Sports' },
          { value: 'fast-shipping', label: 'Fast Shipping' },
          { value: 'fragile', label: 'Fragile' },
          { value: 'heavy', label: 'Heavy Item' },
        ];
      case 'collection':
        return [
          { value: 'featured-products', label: 'Featured Products' },
          { value: 'new-arrivals', label: 'New Arrivals' },
          { value: 'sale-items', label: 'Sale Items' },
          { value: 'seasonal', label: 'Seasonal' },
          { value: 'bestsellers', label: 'Bestsellers' },
        ];
      case 'collection_tag':
        return [
          { value: 'express', label: 'Express Delivery' },
          { value: 'standard', label: 'Standard Delivery' },
          { value: 'economy', label: 'Economy Delivery' },
          { value: 'overnight', label: 'Overnight' },
        ];
      case 'product':
        return [];
      case 'sku':
        return [
          { value: 'manual-entry', label: 'Enter SKU manually' },
        ];
      case 'variant':
        return [
          { value: 'manual-entry', label: 'Enter Variant ID manually' },
        ];
      default:
        return [];
    }
  };

  const currentOptions = getOptionsForTargetType(formData.targetType);
  const allowsMultipleSelection = ['tag', 'collection', 'collection_tag'].includes(formData.targetType);
  const requiresManualEntry = ['sku', 'variant'].includes(formData.targetType);
  const requiresProductSearch = formData.targetType === 'product';

  const handleTargetTypeChange = (value) => {
    setFormData({ 
      ...formData, 
      targetType: value, 
      targetValue: '',
      selectedItems: []
    });
    setSelectedOptions([]);
    setSelectedProducts([]);
    setProductQuery('');
  };

  const handleOptionSelection = (selected) => {
    setSelectedOptions(selected);
    if (allowsMultipleSelection) {
      const selectedLabels = selected.map(value => {
        const option = currentOptions.find(opt => opt.value === value);
        return option ? option.label : value;
      });
      setFormData({ 
        ...formData, 
        selectedItems: selected,
        targetValue: selectedLabels.join(', ')
      });
    } else {
      const selectedOption = currentOptions.find(opt => opt.value === selected[0]);
      setFormData({ 
        ...formData, 
        selectedItems: selected,
        targetValue: selectedOption ? selectedOption.label : selected[0]
      });
    }
  };

  const togglePopover = () => setPopoverActive(!popoverActive);

  // Reference for hidden input to trigger save bar
  const hiddenInputRef = useRef(null);

  // Check for unsaved changes in form data, country selection, and product selection
  useEffect(() => {
    if (!initialFormData.current) return;
    
    // Check if there are any changes in form data, country selection, or product selection
    const hasFormChanges = JSON.stringify(formData) !== JSON.stringify(initialFormData.current);
    const hasCountryChanges = countrySelection.type === 'all' || countrySelection.countries.length > 0;
    const hasProductChanges = selectedProducts.length > 0;
    
    const hasAnyChanges = hasFormChanges || hasCountryChanges || hasProductChanges;
    setHasUnsavedChanges(hasAnyChanges);
    
    // Don't automatically trigger save bar - only show it when user tries to navigate away
    
    // Reset to initial state if no changes
    if (hiddenInputRef.current && !hasAnyChanges) {
      hiddenInputRef.current.value = '0';
      hiddenInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, [formData, countrySelection, selectedProducts]);

  // Form submission is handled automatically by the form element
  // with the hidden input fields containing the current form data
  
  // Handle save response
  useEffect(() => {
    if (actionData?.success) {
      // Mark as saved and update initial state
      setHasUnsavedChanges(false);
      const submitData = {
        ...formData,
        countryCodes: countrySelection.type === 'all' ? 'ALL' : 
                     countrySelection.countries.map(c => c.code).join(', ')
      };
      initialFormData.current = { ...submitData };
      
      // Reset the hidden input to clear data-save-bar state
      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = '0';
        hiddenInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }, [actionData, formData, countrySelection]);

  const handleDiscard = useCallback(() => {
    console.log('Discarding changes...');
    // Reset form to initial state
    const initialState = getInitialFormData();
    setFormData(initialState);
    
    // Reset country selection to empty
    setCountrySelection({ type: 'specific', countries: [] });
    
    // Reset product selection
    setSelectedProducts([]);
    setSelectedOptions([]);
    setProductQuery('');
    
    // Update initial form data reference
    initialFormData.current = { ...initialState };
    setHasUnsavedChanges(false);
  }, []);

  const handleNavigation = useCallback(async (path) => {
    if (hasUnsavedChanges) {
      // Trigger data-save-bar when user tries to navigate away with unsaved changes
      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = Date.now().toString();
        hiddenInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      try {
        // Use App Bridge's leaveConfirmation to handle navigation
        const app = window.shopify;
        if (app && app.saveBar) {
          await app.saveBar.leaveConfirmation();
        }
      } catch (error) {
        // User cancelled navigation
        return;
      }
    }
    navigate(path);
  }, [navigate, hasUnsavedChanges]);

  const handleDiscardChanges = () => {
    setHasUnsavedChanges(false);
    setShowUnsavedDialog(false);
    if (pendingNavigation.current) {
      navigate(pendingNavigation.current);
      pendingNavigation.current = null;
    }
  };

  const handleKeepEditing = () => {
    setShowUnsavedDialog(false);
    pendingNavigation.current = null;
  };

  const handleSaveAndContinue = () => {
    // Trigger form submission
    const form = document.querySelector('form[data-save-bar]');
    if (form) {
      form.requestSubmit();
    }
    setShowUnsavedDialog(false);
    if (pendingNavigation.current) {
      navigate(pendingNavigation.current);
      pendingNavigation.current = null;
    }
  };

  return (
    <Page
      backAction={{ content: 'Dashboard', onAction: () => handleNavigation('/app') }}
      title="Add New Delivery Rule"
      subtitle={hasUnsavedChanges ? 'You have unsaved changes' : undefined}
    >
      <TitleBar title="Add New Delivery Rule" />
      <form 
        data-save-bar 
        data-discard-confirmation
        method="POST"
        onSubmit={(e) => {
          // Update hidden input values before submission
          const form = e.currentTarget;
          const targetTypeInput = form.querySelector('input[name="targetType"]');
          const targetValueInput = form.querySelector('input[name="targetValue"]');
          const countryCodesInput = form.querySelector('input[name="countryCodes"]');
          const estimatedMinDaysInput = form.querySelector('input[name="estimatedMinDays"]');
          const estimatedMaxDaysInput = form.querySelector('input[name="estimatedMaxDays"]');
          const customMessageInput = form.querySelector('input[name="customMessage"]');
          const enabledInput = form.querySelector('input[name="enabled"]');
          const isDefaultInput = form.querySelector('input[name="isDefault"]');
          
          if (targetTypeInput) targetTypeInput.value = formData.targetType;
          if (targetValueInput) targetValueInput.value = formData.targetValue;
          if (countryCodesInput) {
            countryCodesInput.value = JSON.stringify(
              countrySelection.type === 'all' 
                ? ['ALL'] 
                : countrySelection.countries.map(c => c.code)
            );
          }
          if (estimatedMinDaysInput) estimatedMinDaysInput.value = formData.estimatedMinDays;
          if (estimatedMaxDaysInput) estimatedMaxDaysInput.value = formData.estimatedMaxDays;
          if (customMessageInput) customMessageInput.value = formData.customMessage;
          if (enabledInput) enabledInput.value = formData.enabled.toString();
          if (isDefaultInput) isDefaultInput.value = formData.isDefault.toString();
          
          // Don't trigger save bar during actual save - only during navigation attempts
        }}
        onReset={(e) => {
          e.preventDefault();
          handleDiscard();
        }}
      >
        <input 
          ref={hiddenInputRef}
          type="hidden" 
          name="formState" 
          defaultValue="0"
        />
        {/* Hidden form fields for submission */}
        <input type="hidden" name="targetType" value={formData.targetType} />
        <input type="hidden" name="targetValue" value={formData.targetValue} />
        <input type="hidden" name="countryCodes" value={JSON.stringify(countrySelection.type === 'all' ? ['ALL'] : countrySelection.countries.map(c => c.code))} />
        <input type="hidden" name="estimatedMinDays" value={formData.estimatedMinDays} />
        <input type="hidden" name="estimatedMaxDays" value={formData.estimatedMaxDays} />
        <input type="hidden" name="customMessage" value={formData.customMessage} />
        <input type="hidden" name="enabled" value={formData.enabled.toString()} />
        <input type="hidden" name="isDefault" value={formData.isDefault.toString()} />
        <Layout>
          <Layout.Section>
            {/* Success/Error Banner */}
            {actionData?.success && (
              <Banner status="success">
                {actionData.message}
              </Banner>
            )}
            {actionData?.error && (
              <Banner status="critical">
                {actionData.error}
              </Banner>
            )}
            
            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingMd">
                  Rule Configuration
                </Text>
              
              <Banner status="info">
                <p>Currently, rules need to be added directly to your Supabase database. Use the form below to generate the SQL insert statement.</p>
              </Banner>

              <FormLayout>
                <Select
                  label="Target Type"
                  options={targetTypeOptions}
                  value={formData.targetType}
                  onChange={handleTargetTypeChange}
                  helpText="What should this rule target?"
                />

                {requiresProductSearch ? (
                  <div>
                    <Text as="label" variant="bodyMd">
                      Select Product
                    </Text>
                    <div style={{ marginTop: '4px' }}>
                      {selectedProducts.length > 0 && (
                        <div style={{ marginBottom: '4px' }}>
                          <Text as="p" variant="bodySm" color="subdued">
                            {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} selected
                          </Text>
                        </div>
                      )}
                      <Combobox
                        activator={
                          <Combobox.TextField
                            onChange={(value) => {
                              setProductQuery(value);
                              if (value.length > 2) {
                                searchProducts(value);
                              } else if (value.length === 0) {
                                searchProducts('');
                              }
                            }}
                            label="Target Products"
                            value={productQuery}
                            placeholder="Type to search products..."
                            autoComplete="off"
                          />
                        }
                        allowMultiple={true}
                        onScrolledToBottom={loadMoreProducts}
                        loading={isLoadingProducts}
                        onSelect={handleProductSelect}
                      >
                        {products.length > 0 ? (
                          <Listbox onSelect={(selectedValue) => {
                            if (selectedValue === 'select-all-products') {
                              // Handle Select All
                              const allSelected = selectedProducts.length === products.length;
                              if (allSelected) {
                                // Deselect all
                                handleProductSelect([]);
                              } else {
                                // Select all
                                handleProductSelect(products.map(p => p.id));
                              }
                            } else {
                              const isSelected = selectedProducts.some(p => p.id === selectedValue);
                              let newSelectedIds;
                              if (isSelected) {
                                // Remove from selection
                                newSelectedIds = selectedProducts.filter(p => p.id !== selectedValue).map(p => p.id);
                              } else {
                                // Add to selection
                                newSelectedIds = [...selectedProducts.map(p => p.id), selectedValue];
                              }
                              handleProductSelect(newSelectedIds);
                            }
                          }}>
                            <Listbox.Option
                              key="select-all-products"
                              value="select-all-products"
                              selected={selectedProducts.length === products.length && products.length > 0}
                              accessibilityLabel="Select all products"
                            >
                              <Listbox.TextOption selected={selectedProducts.length === products.length && products.length > 0}>
                                 <Text as="p" variant="bodyMd" fontWeight="semibold">
                                   {selectedProducts.length === products.length && products.length > 0 ? 'Deselect All Products' : 'Select All Products'}
                                 </Text>
                               </Listbox.TextOption>
                            </Listbox.Option>
                            {products.map((product) => (
                              <Listbox.Option
                                key={product.id}
                                value={product.id}
                                selected={selectedProducts.some(p => p.id === product.id)}
                                accessibilityLabel={product.title}
                              >
                                <Listbox.TextOption selected={selectedProducts.some(p => p.id === product.id)}>
                                  <InlineStack gap="300" align="start">
                                    <Avatar
                                      size="small"
                                      source={product.featuredImage?.url}
                                      name={product.title}
                                    />
                                    <div>
                                      <Text as="p" variant="bodyMd">
                                        {product.title}
                                      </Text>
                                    </div>
                                  </InlineStack>
                                </Listbox.TextOption>
                              </Listbox.Option>
                            ))}
                            {hasNextPage && (
                              <Listbox.Loading accessibilityLabel="Loading more products" />
                            )}
                          </Listbox>
                        ) : (
                          <Listbox>
                            <Listbox.Option value="" disabled>
                              <Listbox.TextOption>
                                {isLoadingProducts ? 'Loading...' : 'No products found'}
                              </Listbox.TextOption>
                            </Listbox.Option>
                          </Listbox>
                        )}
                      </Combobox>
                    </div>
                    <Text as="p" variant="bodyMd" color="subdued" tone="subdued">
                      Search and select products to target with this delivery rule (multiple selection allowed)
                    </Text>
                    {selectedProducts.length > 0 && (
                      <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#f6f6f7', borderRadius: '6px' }}>
                        <Text as="p" variant="bodyMd" style={{ marginBottom: '8px' }}>
                          Selected Products ({selectedProducts.length}):
                        </Text>
                        <BlockStack gap="200">
                          {selectedProducts.map((product) => (
                            <InlineStack key={product.id} gap="300" align="start">
                              <Avatar
                                size="small"
                                source={product.featuredImage?.url}
                                name={product.title}
                              />
                              <div>
                                <Text as="p" variant="bodyMd">
                                  {product.title}
                                </Text>
                              </div>
                            </InlineStack>
                          ))}
                        </BlockStack>
                      </div>
                    )}
                  </div>
                ) : requiresManualEntry ? (
                  <TextField
                    label="Target Value"
                    value={formData.targetValue}
                    onChange={(value) => setFormData({ ...formData, targetValue: value })}
                    placeholder={`Enter ${formData.targetType === 'sku' ? 'SKU' : 'Variant ID'}`}
                    helpText={`Enter the specific ${formData.targetType === 'sku' ? 'SKU' : 'variant ID'} to target`}
                  />
                ) : allowsMultipleSelection ? (
                  <div>
                    <Text as="label" variant="bodyMd">
                      Target Values {allowsMultipleSelection && '(Multiple selection allowed)'}
                    </Text>
                    <div style={{ marginTop: '4px' }}>
                      <Popover
                        active={popoverActive}
                        activator={
                          <Button
                            disclosure
                            onClick={togglePopover}
                            fullWidth
                            textAlign="left"
                          >
                            {selectedOptions.length > 0 
                              ? `${selectedOptions.length} item${selectedOptions.length > 1 ? 's' : ''} selected`
                              : 'Select options'
                            }
                          </Button>
                        }
                        onClose={togglePopover}
                      >
                        <OptionList
                          onChange={handleOptionSelection}
                          options={currentOptions}
                          selected={selectedOptions}
                          allowMultiple={allowsMultipleSelection}
                        />
                      </Popover>
                    </div>
                    <Text as="p" variant="bodyMd" color="subdued" tone="subdued">
                      Select one or more {formData.targetType}s to target with this delivery rule
                    </Text>
                    {formData.targetValue && (
                      <div style={{ marginTop: '8px' }}>
                        <Text as="p" variant="bodyMd">
                          Selected: {formData.targetValue}
                        </Text>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <Text as="label" variant="bodyMd">
                      Target Value
                    </Text>
                    <div style={{ marginTop: '4px' }}>
                      <Select
                        options={currentOptions}
                        value={selectedOptions[0] || ''}
                        onChange={(value) => handleOptionSelection([value])}
                        placeholder="Select an option"
                      />
                    </div>
                    <Text as="p" variant="bodyMd" color="subdued" tone="subdued">
                      Select the {formData.targetType} to target with this delivery rule
                    </Text>
                  </div>
                )}

                <div>
                  <Text as="label" variant="bodyMd">
                    Select Countries
                  </Text>
                  <div style={{ marginTop: '4px' }}>
                    {getSelectedCountriesCount() > 0 && (
                      <div style={{ marginBottom: '4px' }}>
                        <Text as="p" variant="bodySm" color="subdued">
                          {getSelectedCountriesCount()} countr{getSelectedCountriesCount() > 1 ? 'ies' : 'y'} selected
                          {countrySelection.type === 'all' && ' (All countries)'}
                        </Text>
                      </div>
                    )}
                    <Combobox
                      activator={
                        <Combobox.TextField
                          onChange={(value) => {
                            setCountryQuery(value);
                            if (value.length > 0) {
                              const filtered = countries.filter(country => 
                                country.name.toLowerCase().includes(value.toLowerCase()) ||
                                country.code.toLowerCase().includes(value.toLowerCase())
                              );
                              setFilteredCountries(filtered);
                            } else {
                              setFilteredCountries(countries);
                            }
                          }}
                          label="Target Countries"
                          value={countryQuery}
                          placeholder="Type to search countries..."
                          autoComplete="off"
                        />
                      }
                      allowMultiple={true}
                      onSelect={handleCountrySelect}
                    >
                      {filteredCountries.length > 0 ? (
                        <Listbox onSelect={(selectedValue) => {
                          if (selectedValue === 'select-all-countries') {
                            handleSelectAllCountries();
                          } else {
                            const isSelected = isCountrySelected(selectedValue);
                            let newSelectedCodes;
                            
                            if (countrySelection.type === 'all') {
                              // If all are selected, switch to specific selection excluding this one
                              newSelectedCodes = countries.filter(c => c.code !== selectedValue).map(c => c.code);
                            } else {
                              // Handle specific selection
                              if (isSelected) {
                                // Remove from selection
                                newSelectedCodes = countrySelection.countries.filter(c => c.code !== selectedValue).map(c => c.code);
                              } else {
                                // Add to selection
                                newSelectedCodes = [...countrySelection.countries.map(c => c.code), selectedValue];
                              }
                            }
                            handleCountrySelect(newSelectedCodes);
                          }
                        }}>
                          <Listbox.Option
                            key="select-all-countries"
                            value="select-all-countries"
                            selected={countrySelection.type === 'all' || (countrySelection.type === 'specific' && countrySelection.countries.length === filteredCountries.length && filteredCountries.length > 0)}
                            accessibilityLabel="Select all countries"
                          >
                            <Listbox.TextOption selected={countrySelection.type === 'all' || (countrySelection.type === 'specific' && countrySelection.countries.length === filteredCountries.length && filteredCountries.length > 0)}>
                               <Text as="p" variant="bodyMd" fontWeight="semibold">
                                 {(countrySelection.type === 'all' || (countrySelection.type === 'specific' && countrySelection.countries.length === filteredCountries.length && filteredCountries.length > 0)) ? 'Deselect All Countries' : 'Select All Countries'}
                               </Text>
                             </Listbox.TextOption>
                          </Listbox.Option>
                          {filteredCountries.map((country) => {
                            const isSelected = isCountrySelected(country.code);
                            const FlagComponent = getFlagComponent(country.code);
                            
                            return (
                              <Listbox.Option
                                key={country.code}
                                value={country.code}
                                selected={isSelected}
                                accessibilityLabel={`${country.name} (${country.code})`}
                              >
                                <Listbox.TextOption selected={isSelected}>
                                  <InlineStack gap="300" align="start">
                                    {FlagComponent ? (
                                      <FlagComponent style={{ width: '20px', height: '15px' }} />
                                    ) : (
                                      <div style={{ width: '20px', height: '15px', backgroundColor: '#ccc', borderRadius: '2px' }} />
                                    )}
                                    <div>
                                      <Text as="p" variant="bodyMd">
                                        {country.name} ({country.code})
                                      </Text>
                                    </div>
                                  </InlineStack>
                                </Listbox.TextOption>
                              </Listbox.Option>
                            );
                          })}
                        </Listbox>
                      ) : (
                        <Listbox>
                          <Listbox.Option value="" disabled>
                            <Listbox.TextOption>
                              No countries found
                            </Listbox.TextOption>
                          </Listbox.Option>
                        </Listbox>
                      )}
                    </Combobox>
                  </div>
                  <Text as="p" variant="bodyMd" color="subdued" tone="subdued">
                    Search and select countries to target with this delivery rule (multiple selection allowed)
                  </Text>
                  {getSelectedCountriesCount() > 0 && (
                    <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#f6f6f7', borderRadius: '6px' }}>
                      <Text as="p" variant="bodyMd" style={{ marginBottom: '8px' }}>
                        Selected Countries ({getSelectedCountriesCount()}):
                        {countrySelection.type === 'all' && ' (All countries)'}
                      </Text>
                      <BlockStack gap="200">
                        {getSelectedCountriesForDisplay().slice(0, 10).map((country) => {
                          const FlagComponent = getFlagComponent(country.code);
                          return (
                            <InlineStack key={country.code} gap="300" align="start">
                              {FlagComponent ? (
                                <FlagComponent style={{ width: '20px', height: '15px', marginTop: '2px' }} />
                              ) : (
                                <div style={{ width: '20px', height: '15px', backgroundColor: '#ccc', borderRadius: '2px', marginTop: '2px' }} />
                              )}
                              <div>
                                <Text as="p" variant="bodyMd">
                                  {country.name}
                                </Text>
                                <Text as="p" variant="bodySm" color="subdued">
                                  {country.code}
                                </Text>
                              </div>
                            </InlineStack>
                          );
                        })}
                        {getSelectedCountriesCount() > 10 && (
                          <Text as="p" variant="bodySm" color="subdued">
                            ... and {getSelectedCountriesCount() - 10} more
                          </Text>
                        )}
                      </BlockStack>
                    </div>
                  )}
                </div>

                <FormLayout.Group>
                  <TextField
                    label="Minimum Days"
                    type="number"
                    value={formData.estimatedMinDays}
                    onChange={(value) => setFormData({ ...formData, estimatedMinDays: value })}
                  />
                  <TextField
                    label="Maximum Days"
                    type="number"
                    value={formData.estimatedMaxDays}
                    onChange={(value) => setFormData({ ...formData, estimatedMaxDays: value })}
                  />
                </FormLayout.Group>

                <TextField
                  label="Custom Message"
                  value={formData.customMessage}
                  onChange={(value) => setFormData({ ...formData, customMessage: value })}
                  placeholder="Express delivery available"
                  helpText="Optional custom message to display with the estimate"
                />

                <Checkbox
                  label="Enable this rule"
                  checked={formData.enabled}
                  onChange={(checked) => setFormData({ ...formData, enabled: checked })}
                />

                <Checkbox
                  label="Set as default rule for this shop"
                  checked={formData.isDefault}
                  onChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                  helpText="Default rules are used when no specific product/tag/collection rules match"
                />
                
                {/* Save Button Section */}
                <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e1e3e5' }}>
                  <InlineStack gap="300" align="end">
                    <Button
                      variant="secondary"
                      onClick={() => handleNavigation('/app')}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      submit
                      disabled={!hasUnsavedChanges}
                    >
                      {hasUnsavedChanges ? 'Save Rule' : 'Saved'}
                    </Button>
                  </InlineStack>
                </div>
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingMd">
                SQL Insert Statement
              </Text>
              <Text as="p" variant="bodyMd" color="subdued">
                Copy this SQL statement and run it in your Supabase SQL editor:
              </Text>
              <div style={{ 
                backgroundColor: '#f6f6f7', 
                padding: '12px', 
                borderRadius: '6px', 
                fontFamily: 'monospace',
                fontSize: '12px',
                wordBreak: 'break-all'
              }}>
                {`INSERT INTO delivery_rules (
  shop,
  target_type,
  target_value,
  country_codes,
  estimated_min_days,
  estimated_max_days,
  custom_message,
  enabled,
  is_default,
  created_at,
  updated_at
) VALUES (
  '${shop}',
  '${formData.targetType}',
  '${formData.targetValue}',
  '{${formData.countryCodes.split(',').map(c => `"${c.trim()}"`).join(',')}}',
  ${formData.estimatedMinDays},
  ${formData.estimatedMaxDays},
  '${formData.customMessage}',
  ${formData.enabled},
  ${formData.isDefault},
  NOW(),
  NOW()
);`}
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
      </form>

    </Page>
  );
}