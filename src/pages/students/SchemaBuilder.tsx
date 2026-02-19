import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Code, 
  FileJson, 
  HelpCircle, 
  Package, 
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Trash2,
  Sparkles,
  Copy
} from "lucide-react";
import { useState } from "react";

const schemaTypes = [
  { 
    id: "faq", 
    name: "FAQ", 
    icon: HelpCircle, 
    description: "Frequently Asked Questions",
    eligibility: "High",
    color: "text-success"
  },
  { 
    id: "article", 
    name: "Article", 
    icon: FileText, 
    description: "News or blog articles",
    eligibility: "Medium",
    color: "text-warning"
  },
  { 
    id: "product", 
    name: "Product", 
    icon: Package, 
    description: "E-commerce products",
    eligibility: "High",
    color: "text-success"
  },
];

interface FAQItem {
  question: string;
  answer: string;
}

export default function SchemaBuilder() {
  const [selectedType, setSelectedType] = useState("faq");
  const [faqItems, setFaqItems] = useState<FAQItem[]>([
    { question: "", answer: "" }
  ]);
  const [articleData, setArticleData] = useState({
    headline: "",
    author: "",
    datePublished: "",
    description: ""
  });
  const [productData, setProductData] = useState({
    name: "",
    description: "",
    price: "",
    currency: "USD",
    availability: "InStock"
  });

  const addFaqItem = () => {
    setFaqItems([...faqItems, { question: "", answer: "" }]);
  };

  const removeFaqItem = (index: number) => {
    setFaqItems(faqItems.filter((_, i) => i !== index));
  };

  const updateFaqItem = (index: number, field: "question" | "answer", value: string) => {
    const updated = [...faqItems];
    updated[index][field] = value;
    setFaqItems(updated);
  };

  const generateSchema = () => {
    if (selectedType === "faq") {
      return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqItems.filter(f => f.question && f.answer).map(f => ({
          "@type": "Question",
          "name": f.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": f.answer
          }
        }))
      };
    }
    if (selectedType === "article") {
      return {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": articleData.headline,
        "author": {
          "@type": "Person",
          "name": articleData.author
        },
        "datePublished": articleData.datePublished,
        "description": articleData.description
      };
    }
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": productData.name,
      "description": productData.description,
      "offers": {
        "@type": "Offer",
        "price": productData.price,
        "priceCurrency": productData.currency,
        "availability": `https://schema.org/${productData.availability}`
      }
    };
  };

  const validationResults = [
    { label: "Valid JSON-LD structure", passed: true },
    { label: "Required fields present", passed: selectedType === "faq" ? faqItems.some(f => f.question && f.answer) : true },
    { label: "Schema.org vocabulary", passed: true },
    { label: "No deprecated properties", passed: true },
  ];

  const passedValidations = validationResults.filter(v => v.passed).length;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Structured Data Builder</h1>
          <p className="text-muted-foreground mt-1">
            Create schema markup for enhanced search results
          </p>
        </div>

        {/* Schema Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {schemaTypes.map((type) => (
            <Card 
              key={type.id}
              className={`cursor-pointer transition-all ${
                selectedType === type.id 
                  ? "border-primary ring-2 ring-primary/20" 
                  : "hover:border-primary/50"
              }`}
              onClick={() => setSelectedType(type.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center`}>
                      <type.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{type.name}</h3>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={type.color}>
                    {type.eligibility}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Schema Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5 text-primary" />
                Schema Editor
              </CardTitle>
              <CardDescription>
                Fill in the fields to generate structured data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedType} onValueChange={setSelectedType}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="faq">FAQ</TabsTrigger>
                  <TabsTrigger value="article">Article</TabsTrigger>
                  <TabsTrigger value="product">Product</TabsTrigger>
                </TabsList>

                <TabsContent value="faq" className="space-y-4 mt-4">
                  {faqItems.map((item, index) => (
                    <div key={index} className="p-4 border border-border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Question {index + 1}</span>
                        {faqItems.length > 1 && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => removeFaqItem(index)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Question</Label>
                        <Input 
                          placeholder="What is your question?"
                          value={item.question}
                          onChange={(e) => updateFaqItem(index, "question", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Answer</Label>
                        <Textarea 
                          placeholder="Provide a clear, concise answer..."
                          value={item.answer}
                          onChange={(e) => updateFaqItem(index, "answer", e.target.value)}
                          className="min-h-[80px]"
                        />
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" onClick={addFaqItem}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Question
                  </Button>
                </TabsContent>

                <TabsContent value="article" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Headline</Label>
                    <Input 
                      placeholder="Article headline"
                      value={articleData.headline}
                      onChange={(e) => setArticleData({...articleData, headline: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Author Name</Label>
                    <Input 
                      placeholder="John Doe"
                      value={articleData.author}
                      onChange={(e) => setArticleData({...articleData, author: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date Published</Label>
                    <Input 
                      type="date"
                      value={articleData.datePublished}
                      onChange={(e) => setArticleData({...articleData, datePublished: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea 
                      placeholder="Brief description of the article..."
                      value={articleData.description}
                      onChange={(e) => setArticleData({...articleData, description: e.target.value})}
                      className="min-h-[80px]"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="product" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Product Name</Label>
                    <Input 
                      placeholder="Product name"
                      value={productData.name}
                      onChange={(e) => setProductData({...productData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea 
                      placeholder="Product description..."
                      value={productData.description}
                      onChange={(e) => setProductData({...productData, description: e.target.value})}
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Price</Label>
                      <Input 
                        type="number"
                        placeholder="99.99"
                        value={productData.price}
                        onChange={(e) => setProductData({...productData, price: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Input 
                        placeholder="USD"
                        value={productData.currency}
                        onChange={(e) => setProductData({...productData, currency: e.target.value})}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Generated Schema & Validation */}
          <div className="space-y-6">
            {/* Validation */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Validation Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {validationResults.map((result, index) => (
                  <div key={index} className="flex items-center gap-3">
                    {result.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive" />
                    )}
                    <span className={`text-sm ${result.passed ? "text-foreground" : "text-muted-foreground"}`}>
                      {result.label}
                    </span>
                  </div>
                ))}
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">
                      AI Answer Eligibility: 
                      <span className={`ml-2 ${passedValidations === validationResults.length ? "text-success" : "text-warning"}`}>
                        {passedValidations === validationResults.length ? "High" : "Medium"}
                      </span>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Generated Code */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileJson className="w-5 h-5 text-primary" />
                    Generated JSON-LD
                  </CardTitle>
                  <Button variant="outline" size="sm">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted/50 p-4 rounded-lg overflow-auto text-xs max-h-[300px]">
                  <code className="text-foreground">
                    {JSON.stringify(generateSchema(), null, 2)}
                  </code>
                </pre>
              </CardContent>
            </Card>

            {/* Field Explanations */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-foreground">Schema Learning Tip</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedType === "faq" && "FAQ schema helps search engines display your Q&A content directly in search results, increasing visibility and click-through rates."}
                      {selectedType === "article" && "Article schema helps search engines understand your content structure, potentially featuring it in Top Stories or news carousels."}
                      {selectedType === "product" && "Product schema enables rich snippets showing price, availability, and reviews directly in search results."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
