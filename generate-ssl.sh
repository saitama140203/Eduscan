#!/bin/bash

# Generate SSL Certificates for EduScan Development
echo "🔐 Generating SSL certificates for EduScan..."

# Create SSL directory
mkdir -p nginx/ssl

# Generate private key
openssl genrsa -out nginx/ssl/eduscan.key 2048

# Generate certificate signing request
openssl req -new -key nginx/ssl/eduscan.key -out nginx/ssl/eduscan.csr \
    -subj "/C=VN/ST=HaNoi/L=HaNoi/O=EduScan/OU=IT/CN=eduscan.local/emailAddress=admin@eduscan.local"

# Generate self-signed certificate (valid for 365 days)
openssl x509 -req -days 365 -in nginx/ssl/eduscan.csr -signkey nginx/ssl/eduscan.key -out nginx/ssl/eduscan.crt \
    -extensions v3_req -extfile <(
cat <<EOF
[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = eduscan.local
DNS.2 = www.eduscan.local
DNS.3 = localhost
IP.1 = 127.0.0.1
IP.2 = 103.67.199.62
EOF
)

# Set permissions
chmod 600 nginx/ssl/eduscan.key
chmod 644 nginx/ssl/eduscan.crt

# Clean up CSR file
rm nginx/ssl/eduscan.csr

echo "✅ SSL certificates generated successfully!"
echo "📍 Certificate: nginx/ssl/eduscan.crt"
echo "🔑 Private key: nginx/ssl/eduscan.key"
echo ""
echo "⚠️  Note: These are self-signed certificates for development."
echo "   For production, use Let's Encrypt or proper CA-signed certificates."
echo ""
echo "🌐 Add this to your /etc/hosts file:"
echo "   127.0.0.1 eduscan.local"
echo "   103.67.199.62 eduscan.local" 