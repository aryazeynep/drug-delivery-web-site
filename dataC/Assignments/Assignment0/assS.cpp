#include <iostream>
#include <vector>
#include <string>
#include <fstream>

void cleanFile(){
    std::ofstream outputFile("outputa.txt", std::ios::trunc);
    outputFile.close();
    if (!outputFile.is_open()) {
        std::cerr << "1Dosya oluşturulamadı!" << std::endl;
    }
}

void writeFile(std::string data){
    std::fstream outputFile("outputa.txt", std::ios::app);
    outputFile << data << std::endl;

    if (!outputFile.is_open()) {
        std::cerr << "2Dosya oluşturulamadı!" << std::endl;
    }
    outputFile.close();
}

int main(){

    //cleanFile(); //we make an output.txt file and clean it if it has already has sth init.

    std::fstream file("part1_input.txt");

    if(!file.is_open()){
        std::cerr<< "File canttt opennnnn" << std::endl;
        std::exit(-1);
    }

    std::string sentence;

    while (std::getline(file, sentence))
    {
        std::cout << sentence << std::endl;
        writeFile(sentence);


    }
    std::cout << "deneme" << "\n";

    std::cout << "- - - - - - - - - - \n"
                 "BBM201 Statistics (Part 1)\n"
                 "- - - - - - - - - - \n";

    file.close();

    std::fstream outDen("yeni.txt", std::ios::app);
    outDen << "yazi" << std::endl;

    if (!outDen.is_open()) {
        std::cerr << "3Dosya oluşturulamadı!" << std::endl;
    }

    std::string sent;
    while (std::getline(outDen, sent))
    {
        std::cout << sent << std::endl;
    }

    outDen.close();
}