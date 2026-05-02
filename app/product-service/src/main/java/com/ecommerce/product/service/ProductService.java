package com.ecommerce.product.service;

import com.ecommerce.product.model.Product;
import com.ecommerce.product.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class ProductService {

    @Autowired
    private ProductRepository repository;

    public List<Product> getAllProducts() { return repository.findAll(); }
    public Optional<Product> getProductById(Long id) { return repository.findById(id); }
    public Product createProduct(Product product) { return repository.save(product); }
    public void deleteProduct(Long id) { repository.deleteById(id); }

    public Product updateProduct(Long id, Product details) {
        Product product = repository.findById(id)
            .orElseThrow(() -> new RuntimeException("Product not found: " + id));
        product.setName(details.getName());
        product.setDescription(details.getDescription());
        product.setPrice(details.getPrice());
        product.setStock(details.getStock());
        return repository.save(product);
    }
}
